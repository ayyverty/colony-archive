import type { ArchiveIndex } from '@shared/types'
import { createPageLookup } from '@shared/wiki'
import { escapeHtml, renderMarkdown } from './markdown'

export interface ExportPage {
  path: string
  title: string
  body: string
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function archiveCodeFor(index: ArchiveIndex | null, title: string): string {
  const source = index?.meta?.archiveId || index?.rootPath || title
  let hash = 0
  for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  return `ARC-${hash.toString(16).toUpperCase().padStart(4, '0').slice(-4)}`
}

export function buildExportDocument(
  title: string,
  pages: ExportPage[],
  index: ArchiveIndex | null,
  options: { archiveCode?: string; exportedAt?: string } = {}
): string {
  const lookup = createPageLookup(index)
  const archiveCode = options.archiveCode ?? archiveCodeFor(index, title)
  const exportedAt = options.exportedAt ?? index?.meta?.currentDate ?? new Date().toISOString().slice(0, 10)
  const sections = pages.map((page, position) => {
    const html = renderMarkdown(page.body, {
      lookup,
      fromPath: page.path,
      stripFrontmatter: true
    })
    return `<section class="record" id="record-${position}">
<header class="record__head">
  <div class="record__path">${escapeHtml(page.path)}</div>
  <h1>${escapeHtml(page.title)}</h1>
</header>
${html}
</section>`
  })

  const nav =
    pages.length > 1
      ? `<nav class="toc">
<div class="toc__title">INDEX</div>
<ol>${pages
          .map(
            (page, position) =>
              `<li><a href="#record-${position}">${escapeHtml(page.title)}</a><span>${escapeHtml(
                page.path
              )}</span></li>`
          )
          .join('')}</ol>
</nav>`
      : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f4f2ec;
    color: #1c2326;
    font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.72;
  }
  .shell { max-width: 860px; margin: 0 auto; padding: 44px 40px 90px; background: #fbfaf6; }
  .masthead {
    display: flex; align-items: baseline; gap: 12px;
    padding-bottom: 14px; margin-bottom: 26px;
    border-bottom: 2px solid #1c2326;
    font-family: ui-monospace, "JetBrains Mono", Consolas, monospace;
    font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
  }
  .masthead strong { font-size: 13px; letter-spacing: 0.12em; }
  .masthead span { color: #6d7a80; }
  h1, h2, h3, h4 {
    font-family: ui-monospace, "JetBrains Mono", Consolas, monospace;
    line-height: 1.3; margin: 1.6em 0 0.5em;
  }
  h1 { font-size: 25px; border-bottom: 1px solid #c9c4b8; padding-bottom: 8px; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
  a { color: #0a6e66; }
  code, pre { font-family: ui-monospace, "JetBrains Mono", Consolas, monospace; }
  code { background: #ecebe4; padding: 1px 4px; font-size: 0.92em; }
  pre { background: #ecebe4; padding: 12px 14px; overflow-x: auto; }
  blockquote { margin: 1em 0; padding: 2px 0 2px 14px; border-left: 3px solid #9fb8b4; color: #4a565b; }
  table { border-collapse: collapse; width: 100%; margin: 1.1em 0; font-size: 13px; }
  th, td { border: 1px solid #c9c4b8; padding: 6px 9px; text-align: left; }
  th { background: #ecebe4; font-family: ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
  img { max-width: 100%; height: auto; }
  .record { margin-bottom: 64px; page-break-after: always; }
  .record:last-child { page-break-after: auto; }
  .record__head { margin-bottom: 18px; }
  .record__path {
    font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.16em;
    color: #6d7a80; text-transform: uppercase;
  }
  .record h1 { margin-top: 4px; }
  .toc { margin: 0 0 40px; padding: 18px 20px; border: 1px solid #c9c4b8; background: #f4f2ec; }
  .toc__title { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.2em; color: #6d7a80; margin-bottom: 10px; }
  .toc ol { margin: 0; padding-left: 20px; }
  .toc li { margin: 3px 0; }
  .toc li span { margin-left: 8px; color: #8a9498; font-family: ui-monospace, monospace; font-size: 10px; }
  .chip { display: inline-flex; gap: 4px; align-items: baseline; padding: 0 6px; border: 1px solid #9fb8b4; text-decoration: none; font-size: 0.86em; }
  .chip__kind { font-family: ui-monospace, monospace; font-size: 0.72em; text-transform: uppercase; letter-spacing: 0.08em; color: #0a6e66; }
  .wikilink { text-decoration: none; border-bottom: 1px dotted #0a6e66; }
  .wikilink--missing { color: #9a3b3b; border-bottom-color: #9a3b3b; }
  .as-built { margin-top: 32px; padding-top: 12px; border-top: 1px solid #c9c4b8; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: 0.18em; color: #6d7a80; text-transform: uppercase; }
  @media print {
    .as-built { position: fixed; bottom: 0; left: 40px; right: 40px; }
    body { background: #fff; }
    .shell { max-width: none; padding: 0; background: #fff; }
    a { color: inherit; }
  }
</style>
</head>
<body>
<div class="shell">
  <div class="masthead">
    <strong>RIMCODEX</strong>
    <span>${escapeHtml(title)}</span>
    <span>${pages.length} record${pages.length === 1 ? '' : 's'}</span>
    <span>${new Date().toISOString().slice(0, 10)}</span>
  </div>
  ${nav}
  ${sections.join('\n')}
  <footer class="as-built">RIMCODEX // ${escapeHtml(archiveCode)} // EXPORTED ${escapeHtml(exportedAt)} // DO NOT DUPLICATE</footer>
</div>
</body>
</html>`
}

export function exportSlug(value: string): string {
  return slug(value) || 'rimcodex'
}
