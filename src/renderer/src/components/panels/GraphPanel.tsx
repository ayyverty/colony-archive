import { useMemo, useState } from 'react'
import type { ArchiveIndex } from '@shared/types'
import { pageKind } from '@shared/wiki'
import { useArchiveStore } from '../../state/store'

interface Node {
  path: string
  title: string
  kind: string
  x: number
  y: number
  degree: number
}

interface Edge {
  from: string
  to: string
}

const WIDTH = 820
const HEIGHT = 560
const ITERATIONS = 120
const MAX_NODES = 150

function layout(index: ArchiveIndex): { nodes: Node[]; edges: Edge[] } {
  const degree = new Map<string, number>()
  const edges: Edge[] = []
  const seen = new Set<string>()

  for (const page of index.pages) {
    for (const link of page.links) {
      if (!link.resolved || link.resolved === page.path) continue
      const key = page.path < link.resolved
        ? `${page.path}\u0000${link.resolved}`
        : `${link.resolved}\u0000${page.path}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ from: page.path, to: link.resolved })
      degree.set(page.path, (degree.get(page.path) ?? 0) + 1)
      degree.set(link.resolved, (degree.get(link.resolved) ?? 0) + 1)
    }
  }

  const ranked = [...index.pages].sort(
    (a, b) => (degree.get(b.path) ?? 0) - (degree.get(a.path) ?? 0)
  )
  const included = new Set(ranked.slice(0, MAX_NODES).map((page) => page.path))
  const nodes: Node[] = ranked
    .filter((page) => included.has(page.path))
    .map((page, position, list) => {
      const angle = (position / Math.max(1, list.length)) * Math.PI * 2
      const radius = 0.34 + ((position % 3) * 0.05)
      return {
        path: page.path,
        title: page.title,
        kind: pageKind(page),
        x: WIDTH / 2 + Math.cos(angle) * WIDTH * radius,
        y: HEIGHT / 2 + Math.sin(angle) * HEIGHT * radius,
        degree: degree.get(page.path) ?? 0
      }
    })

  const visibleEdges = edges.filter(
    (edge) => included.has(edge.from) && included.has(edge.to)
  )
  const byPath = new Map(nodes.map((node) => [node.path, node]))

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const cooling = 1 - iteration / ITERATIONS

    for (let a = 0; a < nodes.length; a += 1) {
      for (let b = a + 1; b < nodes.length; b += 1) {
        const first = nodes[a]
        const second = nodes[b]
        let dx = second.x - first.x
        let dy = second.y - first.y
        let distance = Math.hypot(dx, dy) || 0.01
        const minDistance = 34
        if (distance < minDistance) {
          const push = ((minDistance - distance) / distance) * 0.5
          dx *= push
          dy *= push
          first.x -= dx
          first.y -= dy
          second.x += dx
          second.y += dy
        }
        const repulsion = 2600 / (distance * distance)
        const fx = (dx / distance) * repulsion * cooling
        const fy = (dy / distance) * repulsion * cooling
        first.x -= fx
        first.y -= fy
        second.x += fx
        second.y += fy
      }
    }

    for (const edge of visibleEdges) {
      const from = byPath.get(edge.from)
      const to = byPath.get(edge.to)
      if (!from || !to) continue
      const dx = to.x - from.x
      const dy = to.y - from.y
      const distance = Math.hypot(dx, dy) || 0.01
      const strength = (distance - 96) * 0.012 * cooling
      const fx = (dx / distance) * strength
      const fy = (dy / distance) * strength
      from.x += fx
      from.y += fy
      to.x -= fx
      to.y -= fy
    }

    for (const node of nodes) {
      node.x += ((WIDTH / 2 - node.x) / WIDTH) * 4 * cooling
      node.y += ((HEIGHT / 2 - node.y) / HEIGHT) * 4 * cooling
      node.x = Math.max(24, Math.min(WIDTH - 24, node.x))
      node.y = Math.max(24, Math.min(HEIGHT - 24, node.y))
    }
  }

  return { nodes, edges: visibleEdges }
}

export function GraphPanel() {
  const index = useArchiveStore((state) => state.index)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const [hovered, setHovered] = useState<string | null>(null)

  const { nodes, edges } = useMemo(
    () => (index ? layout(index) : { nodes: [], edges: [] }),
    [index]
  )
  const byPath = useMemo(() => new Map(nodes.map((node) => [node.path, node])), [nodes])
  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const edge of edges) {
      const from = map.get(edge.from) ?? new Set<string>()
      from.add(edge.to)
      map.set(edge.from, from)
      const to = map.get(edge.to) ?? new Set<string>()
      to.add(edge.from)
      map.set(edge.to, to)
    }
    return map
  }, [edges])

  if (!index) return <div className="panel-empty">Indexing archive…</div>
  if (nodes.length === 0) {
    return (
      <div className="panel-empty">
        No resolved <code>[[links]]</code> yet. Link two records to draw the graph.
      </div>
    )
  }

  const active = hovered ? neighbours.get(hovered) ?? new Set<string>() : null

  return (
    <div className="graph">
      <div className="graph__meta">
        <span>{nodes.length} nodes</span>
        <span>{edges.length} edges</span>
        <span className="graph__hint">click a node to open · hover to trace</span>
      </div>
      <svg className="graph__canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img">
        <g className="graph__edges">
          {edges.map((edge) => {
            const from = byPath.get(edge.from)
            const to = byPath.get(edge.to)
            if (!from || !to) return null
            const lit =
              hovered && (edge.from === hovered || edge.to === hovered)
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={lit ? 'graph__edge graph__edge--lit' : 'graph__edge'}
              />
            )
          })}
        </g>
        <g className="graph__nodes">
          {nodes.map((node) => {
            const dim = active && node.path !== hovered && !active.has(node.path)
            const radius = 4 + Math.min(9, Math.sqrt(node.degree) * 2.2)
            return (
              <g
                key={node.path}
                className={dim ? 'graph__node graph__node--dim' : 'graph__node'}
                onMouseEnter={() => setHovered(node.path)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => void selectPath(node.path)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  className={`graph__dot graph__dot--${node.kind}`}
                />
                <text x={node.x} y={node.y + radius + 11} className="graph__label">
                  {node.title.length > 22 ? `${node.title.slice(0, 21)}…` : node.title}
                </text>
                <title>{node.path}</title>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
