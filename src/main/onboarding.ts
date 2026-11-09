import { promises as fs } from 'node:fs'
import { MANUAL_MARKDOWN } from '../shared/manual'
import { assertContained, toAbsolute } from './paths'

function welcomeMarkdown(): string {
  return `---
title: Welcome to RimCodex
type: page
classification: internal
tags: [welcome, manual]
---

# Welcome to RimCodex

This archive is a working record. Read it, edit it, and link from it.

## Try these

- Open [[_manual]] for the full operator's manual.
- Create a record with **New Page** and choose **Colonist**.
- Type \`[[New Page]]\` to create a link, then click the \`+\` affordance.
- Drop an image or audio clip into the editor to attach evidence.
- Type \`/\` at the start of a line for slash commands.
- Type \`---\` at the top of a page for frontmatter suggestions.

## Frontmatter demo

\`\`\`md
---
title: Example Colonist
type: colonist
status: alive
traits: [Brave, Kind]
skills: [Shooting: 12, Melee: 4]
---
\`\`\`

## See also

- [[_manual]]
- [[Welcome]]
`
}

export async function ensureOnboarding(root: string): Promise<void> {
  const files = await fs.readdir(root).catch(() => [])
  const hasMarkdown = files.some((entry) => entry.toLowerCase().endsWith('.md'))
  if (hasMarkdown) return

  const welcomePath = toAbsolute(root, 'Welcome.md')
  assertContained(root, welcomePath)
  await fs.writeFile(welcomePath, welcomeMarkdown(), 'utf8')

  const manualPath = toAbsolute(root, '_manual.md')
  assertContained(root, manualPath)
  try {
    await fs.access(manualPath)
  } catch {
    await fs.writeFile(manualPath, MANUAL_MARKDOWN, 'utf8')
  }
}

export async function ensureManualPage(root: string): Promise<void> {
  const manualPath = toAbsolute(root, '_manual.md')
  assertContained(root, manualPath)
  try {
    await fs.access(manualPath)
  } catch {
    await fs.writeFile(manualPath, MANUAL_MARKDOWN, 'utf8')
  }
}