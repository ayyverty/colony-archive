import { useEffect, useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { useArchiveStore, isDirty } from '../state/store'
import { prefersReducedMotion } from '../lib/theme'
import type { TreeNode } from '@shared/types'
import { basename, countPages, findNode } from '../lib/paths'
import { ChevronIcon, FileIcon, FolderIcon, FolderPlusIcon, PlusIcon, StarIcon } from './Icons'
import { ArchiveContextStrip } from './ArchiveContextStrip'
import { InfoTip } from './InfoTip'
import { PathTooltip } from './PathTooltip'

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const expanded = useArchiveStore((state) => Boolean(state.expanded[node.path]))
  const selected = useArchiveStore((state) => state.selected === node.path)
  const dirty = useArchiveStore((state) => isDirty(state, node.path))
  const toggleExpanded = useArchiveStore((state) => state.toggleExpanded)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const setContextMenu = useArchiveStore((state) => state.setContextMenu)
  const movePath = useArchiveStore((state) => state.movePath)
  const [over, setOver] = useState(false)

  const isFolder = node.kind === 'folder'
  const hasChildren = isFolder && (node.children?.length ?? 0) > 0
  const isRoot = node.path === ''

  const activate = (): void => {
    if (isFolder && node.sealed && !useArchiveStore.getState().unsealed[node.path]) {
      const store = useArchiveStore.getState()
      store.openDialog({
        kind: 'confirm',
        title: 'Unseal archive',
        body: '> UNSEAL ARCHIVE? THIS ACTION IS LOGGED.',
        confirmLabel: 'Unseal',
        danger: true,
        onConfirm: async () => {
          store.closeDialog()
          const passphrase = window.prompt('Seal passphrase')
          if (passphrase && store.unsealPath(node.path, passphrase)) {
            store.toggleExpanded(node.path)
          }
        }
      })
      return
    }
    if (isFolder) toggleExpanded(node.path)
    else void selectPath(node.path)
  }

  const canDrop = isFolder
  const onDragOver = (event: DragEvent<HTMLButtonElement>): void => {
    if (!canDrop) return
    const source = event.dataTransfer.types.includes('application/x-colony-path')
    if (!source) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setOver(true)
  }

  const onDrop = (event: DragEvent<HTMLButtonElement>): void => {
    setOver(false)
    if (!canDrop) return
    const source = event.dataTransfer.getData('application/x-colony-path')
    if (!source) return
    event.preventDefault()
    if (source === node.path) return
    if (node.path === source || node.path.startsWith(`${source}/`)) return
    void movePath(source, node.path)
  }

  return (
    <>
      <button
        type="button"
        className={`tree-row ${selected ? 'tree-row--active' : ''} ${
          isFolder ? 'tree-row--dir' : ''
        } ${isRoot ? 'tree-row--root' : ''} ${over ? 'tree-row--drop' : ''}`}
        style={{ paddingLeft: 9 + depth * 13 }}
        onClick={activate}
        draggable={!isRoot}
        onDragStart={(event) => {
          if (isRoot) {
            event.preventDefault()
            return
          }
          event.dataTransfer.setData('application/x-colony-path', node.path)
          event.dataTransfer.setData('text/plain', node.path)
          event.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={onDragOver}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onContextMenu={(event) => {
          event.preventDefault()
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            path: node.path,
            kind: isRoot ? 'root' : node.kind
          })
        }}
        title={node.path || 'Archive root — drop here to move to root'}
      >
        <ChevronIcon
          className={`tree-row__chevron ${expanded ? 'tree-row__chevron--open' : ''} ${
            hasChildren ? '' : 'tree-row__chevron--hidden'
          }`}
        />
        {isFolder ? (
          <FolderIcon className="tree-row__icon" />
        ) : (
          <FileIcon className="tree-row__icon" />
        )}
        <span className="tree-row__label">
          {node.name}
          <PathTooltip path={node.path} kind={node.kind} />
        </span>
        {dirty ? <span className="tree-row__badge">●</span> : null}
      </button>

      {isFolder && expanded
        ? (node.children ?? []).map((child) => (
            <TreeRow key={child.path} node={child} depth={depth + 1} />
          ))
        : null}
    </>
  )
}

function EmptyArchive() {
  const openFolder = useArchiveStore((state) => state.openFolder)

  return (
    <div className="tree-empty">
      <div>No archive mounted.</div>
      <div>Select a folder to index its Markdown records.</div>
      <button
        type="button"
        className="btn btn--accent tree-empty__action"
        onClick={() => void openFolder()}
      >
        Mount folder
      </button>
    </div>
  )
}

function TagBar() {
  const index = useArchiveStore((state) => state.index)
  const activeTag = useArchiveStore((state) => state.activeTag)
  const setActiveTag = useArchiveStore((state) => state.setActiveTag)

  if (!index || index.tags.length === 0) return null

  return (
    <div className="tag-bar" aria-label="Tag filter">
      <button
        type="button"
        className={`tag-chip ${activeTag === null ? 'tag-chip--active' : ''}`}
        onClick={() => setActiveTag(null)}
      >
        all
      </button>
      {index.tags.slice(0, 18).map((tag) => (
        <button
          type="button"
          key={tag.tag}
          className={`tag-chip ${activeTag === tag.tag ? 'tag-chip--active' : ''}`}
          onClick={() => setActiveTag(activeTag === tag.tag ? null : tag.tag)}
          title={`Filter by #${tag.tag}`}
        >
          <InfoTip label={`#${tag.tag}`} description="Filter the archive by this tag." manualAnchor="tags" />
          <span className="tag-chip__count">{tag.count}</span>
        </button>
      ))}
    </div>
  )
}

function PinnedSection() {
  const favorites = useArchiveStore((state) => state.favorites)
  const selected = useArchiveStore((state) => state.selected)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const toggleFavorite = useArchiveStore((state) => state.toggleFavorite)
  const index = useArchiveStore((state) => state.index)
  const tree = useArchiveStore((state) => state.tree)

  const pinned = useMemo(
    () =>
      favorites
        .filter((path) => findNode(tree, path)?.kind === 'file')
        .map((path) => ({
          path,
          title:
            index?.pages.find((page) => page.path === path)?.title ??
            basename(path).replace(/\.md$/i, '')
        })),
    [favorites, index, tree]
  )

  if (pinned.length === 0) return null

  return (
    <div className="pinned">
      <div className="pinned__title">
        <StarIcon size={10} />
        pinned
      </div>
      {pinned.map((entry) => (
        <div
          key={entry.path}
          className={`pinned__row ${selected === entry.path ? 'pinned__row--active' : ''}`}
        >
          <button
            type="button"
            className="pinned__open"
            onClick={() => void selectPath(entry.path)}
            title={entry.path}
          >
            {entry.title}
          </button>
          <button
            type="button"
            className="pinned__remove"
            title="Unpin"
            onClick={() => toggleFavorite(entry.path)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function TagResults() {
  const index = useArchiveStore((state) => state.index)
  const activeTag = useArchiveStore((state) => state.activeTag)
  const selected = useArchiveStore((state) => state.selected)
  const selectPath = useArchiveStore((state) => state.selectPath)

  const pages = useMemo(() => {
    if (!index || !activeTag) return []
    return index.pages
      .filter((page) => page.tags.includes(activeTag))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [index, activeTag])

  if (!activeTag) return null

  return (
    <div className="tag-results">
      <div className="tag-results__head">
        #{activeTag} · {pages.length}
      </div>
      {pages.length === 0 ? (
        <div className="tag-results__empty">No records carry this tag.</div>
      ) : (
        pages.map((page) => (
          <button
            type="button"
            key={page.path}
            className={`tag-results__row ${selected === page.path ? 'tag-results__row--active' : ''}`}
            onClick={() => void selectPath(page.path)}
            title={page.path}
          >
            <span className="tag-results__title">{page.title}</span>
            <span className="tag-results__path">{page.path}</span>
          </button>
        ))
      )}
    </div>
  )
}

export function Sidebar() {
  const visible = useArchiveStore((state) => state.sidebarVisible)
  const focusedPane = useArchiveStore((state) => state.focusedPane)
  const setFocusedPane = useArchiveStore((state) => state.setFocusedPane)
  const tree = useArchiveStore((state) => state.tree)
  const rootPath = useArchiveStore((state) => state.rootPath)
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    if (!rootPath) return
    if (prefersReducedMotion()) return
    setStreaming(true)
    const timer = window.setTimeout(() => setStreaming(false), 450)
    return () => window.clearTimeout(timer)
  }, [rootPath])
  const activeTag = useArchiveStore((state) => state.activeTag)
  const newPageFromSelection = useArchiveStore((state) => state.newPageFromSelection)
  const newFolderFromSelection = useArchiveStore((state) => state.newFolderFromSelection)

  if (!visible) return null

  return (
    <aside
      className={`sidebar ${focusedPane === 'tree' ? 'pane--focused' : ''}`}
      onFocusCapture={() => setFocusedPane('tree')}
      onPointerDown={() => setFocusedPane('tree')}
    >
      <div className="pane-header">
        <span className="pane-header__title">
          {focusedPane === 'tree' ? <span className="pane-header__focus">▸ </span> : null}
          Archive
        </span>
        <div className="pane-header__spacer" />
        <button
          type="button"
          className="icon-btn"
          title="New page (Ctrl+N)"
          onClick={newPageFromSelection}
          disabled={!rootPath}
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="New folder (Ctrl+Shift+N)"
          onClick={newFolderFromSelection}
          disabled={!rootPath}
        >
          <FolderPlusIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Operator log"
          onClick={() => void useArchiveStore.getState().openLog()}
          disabled={!rootPath}
        >
          LOG
        </button>
      </div>

      <ArchiveContextStrip />
      <TagBar />
      <PinnedSection />

      <div className="pane-body">
        {activeTag ? (
          <TagResults />
        ) : tree ? (
          <div
            className={`tree ${streaming ? 'tree--streaming' : ''}`}
            role="tree"
            aria-label="Colony archive records"
            onClick={() => setStreaming(false)}
          >
            <TreeRow node={tree} depth={0} />
          </div>
        ) : (
          <EmptyArchive />
        )}
      </div>

      <div className="sidebar__footer">
        <span>{tree ? `${countPages(tree)} records` : 'offline'}</span>
        <span>{rootPath ? basename(rootPath) : 'no root'}</span>
      </div>
    </aside>
  )
}
