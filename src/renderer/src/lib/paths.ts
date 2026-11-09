import type { TreeNode } from '@shared/types'

export function basename(path: string): string {
  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return index === -1 ? path : path.slice(index + 1)
}

export function dirname(path: string): string {
  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return index === -1 ? '' : path.slice(0, index)
}

export function stem(name: string): string {
  return name.replace(/\.md$/i, '')
}

export function ancestors(path: string): string[] {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  const out: string[] = []
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    out.push(current)
  }
  return out
}

export function findNode(tree: TreeNode | null, path: string): TreeNode | null {
  if (!tree) return null
  if (tree.path === path) return tree
  for (const child of tree.children ?? []) {
    const found = findNode(child, path)
    if (found) return found
  }
  return null
}

export function treeContains(tree: TreeNode | null, path: string): boolean {
  return findNode(tree, path) !== null
}

export function flatten(tree: TreeNode | null, expanded: Record<string, boolean>): TreeNode[] {
  if (!tree) return []
  const out: TreeNode[] = []
  const walk = (node: TreeNode): void => {
    out.push(node)
    if (node.kind === 'folder' && expanded[node.path]) {
      for (const child of node.children ?? []) walk(child)
    }
  }
  walk(tree)
  return out
}

export function countPages(tree: TreeNode | null): number {
  if (!tree) return 0
  let total = 0
  for (const child of tree.children ?? []) {
    total += child.kind === 'file' ? 1 : countPages(child)
  }
  return total
}

/** Resolves a Markdown-relative link against a root-relative directory. */
export function resolveRelative(baseDir: string, target: string): string {
  const stack = baseDir ? baseDir.split('/').filter(Boolean) : []
  for (const part of target.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.join('/')
}
