import { parseFrontmatter } from '../shared/frontmatter'
import { buildArchiveIndex, type RawPage } from '../shared/wiki'
import type {
  IntegrityIssue,
  IntegrityProgress,
  IntegrityReport
} from '../shared/types'
import { ERROR_LABELS } from '../shared/errors'
import { buildTree, readPage } from './fsService'
import { collectFiles } from './indexer'

export interface IntegrityScanOptions {
  signal?: { cancelled: boolean }
  onProgress?: (progress: IntegrityProgress) => void
}

export async function runIntegrityScan(
  root: string,
  options: IntegrityScanOptions = {}
): Promise<IntegrityReport> {
  const started = Date.now()
  const signal = options.signal ?? { cancelled: false }
  const emit = (progress: IntegrityProgress): void => {
    if (options.onProgress) options.onProgress(progress)
  }

  const tree = await buildTree(root)
  const paths: string[] = []
  collectFiles(tree, paths)

  const rawPages: RawPage[] = []
  let read = 0
  for (const rel of paths) {
    if (signal.cancelled) break
    try {
      const page = await readPage(root, rel)
      rawPages.push({ path: page.path, content: page.content, mtimeMs: page.mtimeMs })
    } catch {
      // Unreadable records are reported by the filesystem layer elsewhere.
    }
    read += 1
    emit({
      phase: 'scan',
      current: read,
      total: paths.length,
      line: `scanning ${rel}`
    })
  }

  const index = buildArchiveIndex(root, rawPages)
  const issues: IntegrityIssue[] = []

  for (const raw of rawPages) {
    if ((raw.path.split('/').pop() ?? '').startsWith('_')) continue
    const parsed = parseFrontmatter(raw.content)
    if (parsed.error) {
      issues.push({
        code: 'E-117',
        path: raw.path,
        message: parsed.error
      })
    }
    if (raw.content.trim().length === 0) {
      issues.push({
        code: 'E-118',
        path: raw.path,
        message: 'Record is empty.'
      })
    }
  }

  for (const link of index.brokenLinks) {
    issues.push({
      code: 'E-203',
      path: link.from,
      message: `Unresolved link: [[${link.target}]]`
    })
  }

  for (const page of index.pages) {
    if (page.path.startsWith('_')) continue
    if (page.links.length === 0 && page.backlinks.length === 0) {
      issues.push({
        code: 'E-204',
        path: page.path,
        message: 'Orphan record: no inbound or outbound links.'
      })
    }
  }

  const totalSteps = paths.length + issues.length
  let processed = paths.length
  for (const issue of issues) {
    if (signal.cancelled) break
    processed += 1
    emit({
      phase: 'scan',
      current: processed,
      total: Math.max(totalSteps, 1),
      line: `${issue.code} ${ERROR_LABELS[issue.code]} — ${issue.path}`,
      issue
    })
  }

  const counts: Record<string, number> = {}
  for (const issue of issues) {
    counts[issue.code] = (counts[issue.code] ?? 0) + 1
  }

  emit({
    phase: 'scan',
    current: totalSteps,
    total: Math.max(totalSteps, 1),
    line: `scan complete: ${rawPages.length} records, ${issues.length} issue(s)`,
    done: true
  })

  return {
    scanned: rawPages.length,
    durationMs: Date.now() - started,
    issues,
    counts
  }
}