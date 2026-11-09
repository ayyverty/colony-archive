import { Buffer } from 'node:buffer'
import type { ArchiveIndex, TreeNode } from '../shared/types'
import { buildArchiveIndex, type RawPage } from '../shared/wiki'
import { buildTree, readPage } from './fsService'

const MAX_INDEX_PAGES = 5000
const MAX_INDEX_BYTES = 48 * 1024 * 1024
const CONCURRENCY = 12

let cache: { root: string; index: ArchiveIndex } | null = null
let treeCache: { root: string; tree: TreeNode } | null = null

export function invalidateIndex(): void {
  cache = null
  treeCache = null
}

export function cacheTree(root: string, tree: TreeNode): void {
  treeCache = { root, tree }
}

export function getCachedTree(root: string): TreeNode | null {
  return treeCache?.root === root ? treeCache.tree : null
}

export function collectFiles(node: TreeNode, out: string[]): void {
  for (const child of node.children ?? []) {
    if (child.kind === 'file') out.push(child.path)
    else collectFiles(child, out)
  }
}

export async function indexArchive(root: string): Promise<ArchiveIndex> {
  if (cache?.root === root) return cache.index

  const tree = getCachedTree(root) ?? (await buildTree(root))
  if (!getCachedTree(root)) cacheTree(root, tree)
  const paths: string[] = []
  collectFiles(tree, paths)

  const selected = paths.slice(0, MAX_INDEX_PAGES)
  const rawPages: RawPage[] = []
  let totalBytes = 0
  let cursor = 0

  const worker = async (): Promise<void> => {
    while (cursor < selected.length) {
      const index = cursor
      cursor += 1
      const path = selected[index]
      if (totalBytes >= MAX_INDEX_BYTES) continue
      try {
        const file = await readPage(root, path)
        const size = Buffer.byteLength(file.content, 'utf8')
        totalBytes += size
        rawPages.push({
          path: file.path,
          content: file.content,
          mtimeMs: file.mtimeMs,
          size
        })
      } catch {
        // A page can disappear or grow beyond the read limit mid-scan.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, selected.length) }, worker))

  rawPages.sort((a, b) => a.path.localeCompare(b.path))
  const index = buildArchiveIndex(root, rawPages)
  cache = { root, index }
  return index
}
