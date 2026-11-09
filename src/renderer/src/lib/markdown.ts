import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { parseFrontmatter } from '@shared/frontmatter'
import {
  createPageLookup,
  normalizeTag,
  pageKind,
  relativePageHref,
  type PageLookup
} from '@shared/wiki'

/**
 * Strips inline event handlers and active elements from a raw HTML token before
 * the browser parses it. DOMPurify remains the security boundary; this pass
 * exists because Chromium can fire events (e.g. an image error) inside the
 * detached document DOMPurify parses, which would attempt handlers that are
 * about to be removed anyway.
 */
export function neutralizeRawHtml(html: string): string {
  const withoutBlocks = html.replace(
    /<(script|style|iframe|object|embed|form|textarea|select|option|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ''
  )
  const withoutTags = withoutBlocks.replace(
    /<\/?(?:script|style|iframe|object|embed|form|textarea|select|option|link|meta|base|svg|math)\b[^>]*>/gi,
    ''
  )
  return withoutTags.replace(/<[^>]+>/g, (tag) =>
    tag.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  )
}

marked.use({
  gfm: true,
  breaks: false,
  walkTokens(token) {
    // Only real HTML tokens are touched; fenced and inline code stay verbatim.
    if (token.type === 'html') token.text = neutralizeRawHtml(token.text)
  }
})

const ALLOWED_TAGS = [
  'a', 'abbr', 'audio', 'b', 'blockquote', 'br', 'caption', 'code', 'dd', 'del', 'details', 'div',
  'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input',
  'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 's', 'section', 'small', 'source', 'span',
  'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'tr', 'u', 'ul', 'video'
]

const ALLOWED_ATTR = [
  'href', 'title', 'alt', 'src', 'id', 'class', 'align', 'colspan', 'rowspan',
  'data-wiki-create',
  'start', 'type', 'checked', 'disabled', 'lang', 'dir', 'width', 'height',
  'open', 'reversed'
]

const FENCE = /^\s*(```|~~~)/
const DIRECTIVE = /\{\{\s*([A-Za-z][\w-]*)\s*:\s*([^{}\n]+?)\s*\}\}/g
const WIKILINK = /\[\[([^\]\n]+)\]\]/g
const ATTACHMENT_EMBED = /!\[\[([^\]\n]+)\]\]/g
const TAG = /(^|[\s([{,;:.])#([\p{L}][\p{L}\p{N}_-]*)/gu
const CODE_SPAN = /(`[^`]*`)/g

export interface RenderOptions {
  fromPath?: string
  lookup?: PageLookup | null
  stripFrontmatter?: boolean
  classification?: 'public' | 'internal' | 'classified'
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function encodeHref(href: string): string {
  const [pathPart, hash] = href.split('#')
  const encoded = pathPart
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return hash ? `${encoded}#${encodeURIComponent(decodeURIComponent(hash))}` : encoded
}

function kindClass(kind: string): string {
  return `chip--${kind.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'page'}`
}

function resolvedHref(fromPath: string, targetPath: string, heading?: string): string {
  return encodeHref(relativePageHref(fromPath, targetPath, heading))
}

interface WikiParts {
  target: string
  heading?: string
  label?: string
}

function parseWikiInner(inner: string): WikiParts {
  let body = inner.trim()
  let label: string | undefined
  const pipe = body.indexOf('|')
  if (pipe >= 0) {
    label = body.slice(pipe + 1).trim() || undefined
    body = body.slice(0, pipe)
  }
  let heading: string | undefined
  const hash = body.indexOf('#')
  if (hash >= 0) {
    heading = body.slice(hash + 1).trim() || undefined
    body = body.slice(0, hash)
  }
  return { target: body.trim(), heading, label }
}

function renderTagChips(line: string): string {
  return line.replace(TAG, (all, lead: string, raw: string) => {
    const tag = normalizeTag(raw)
    if (tag.length < 2) return all
    return `${lead}<span class="md-tag">#${escapeHtml(tag)}</span>`
  })
}

function renderDirectives(line: string, options: RenderOptions): string {
  const lookup = options.lookup ?? null
  const fromPath = options.fromPath ?? ''
  return line.replace(DIRECTIVE, (all, rawKind: string, rawValue: string) => {
    const kind = rawKind.toLowerCase()
    const value = rawValue.trim()
    if (!value) return all
    const page = lookup?.findDirective(kind, value, fromPath) ?? null
    const label = escapeHtml(value)
    const inner = `<span class="chip__kind">${escapeHtml(
      kind
    )}</span><span class="chip__label">${label}</span>`
    if (page) {
      return `<a class="chip ${kindClass(pageKind(page))} chip--link" href="${resolvedHref(
        fromPath,
        page.path
      )}" title="${escapeHtml(page.title)}">${inner}</a>`
    }
    return `<span class="chip ${kindClass(
      kind
    )} chip--missing" title="No ${escapeHtml(kind)} record named ${label}">${inner}</span>`
  })
}

function renderWikiLinks(line: string, options: RenderOptions): string {
  const lookup = options.lookup ?? null
  const fromPath = options.fromPath ?? ''
  return line.replace(WIKILINK, (_all, inner: string) => {
    const { target, heading, label } = parseWikiInner(inner)
    const page = target
      ? lookup?.resolve(target, fromPath) ?? null
      : lookup?.get(fromPath) ?? null
    const text = escapeHtml(label ?? heading ?? page?.title ?? target ?? 'record')
    if (page) {
      const kind = pageKind(page)
      return `<a class="wikilink wikilink--${kind} ${kindClass(
        kind
      )}" href="${resolvedHref(fromPath, page.path, heading)}" title="${escapeHtml(
        page.title
      )}">${text}</a>`
    }
    return `<a class="wikilink wikilink--missing wikilink--create" href="#" data-wiki-create="${escapeHtml(
      target
    )}" title="Click to create: ${escapeHtml(target)}">+ ${text}</a>`
  })
}

function transformInline(line: string, options: RenderOptions): string {
  return line
    .split(CODE_SPAN)
    .map((part, index) => {
      if (index % 2 === 1) return part
      let next = renderTagChips(part)
      next = renderDirectives(next, options)
      next = renderWikiLinks(next, options)
      return next
    })
    .join('')
}

export function transformWiki(source: string, options: RenderOptions = {}): string {
  let fence = false
  return source
    .split('\n')
    .map((line) => {
      if (FENCE.test(line)) {
        fence = !fence
        return line
      }
      if (fence) return line
      return transformInline(line, options)
    })
    .join('\n')
}

/**
 * Parses Markdown and sanitizes the result. Raw HTML from the file is allowed
 * only insofar as DOMPurify's allowlist permits it: no scripts, event handlers,
 * inline styles, frames, forms or embedded objects survive.
 */
export function transformRedactedCallouts(source: string): string {
  return source.replace(
    /^>\s*\[!redacted\][ \t]*(.*)\n((?:>.*\n?)*)/gim,
    (_all, title: string, block: string) => {
      const inner = block
        .split('\n')
        .map((line) => line.replace(/^>\s?/, ''))
        .join('\n')
        .trim()
      const escaped = escapeHtml(inner).replace(/\n/g, '<br>')
      const label = title.trim() ? escapeHtml(title.trim()) : 'REDACTED'
      return `<div class="redacted-callout" title="hover to declassify"><span class="redacted-callout__veil">████ ${label} ████</span><div class="redacted-callout__content">${escaped}</div></div>\n`
    }
  )
}

export function transformAttachments(source: string): string {
  return source.replace(ATTACHMENT_EMBED, (_all, rawName: string) => {
    const name = rawName.trim()
    const lower = name.toLowerCase()
    const url = `colony-attachment://${encodeURIComponent(name)}`
    if (/\.(png|jpe?g|gif|webp)$/i.test(lower)) {
      return `<img class="attachment attachment--image" src="${url}" alt="${escapeHtml(name)}" loading="lazy" />`
    }
    if (/\.(ogg|mp3|wav|m4a|flac)$/i.test(lower)) {
      return `<audio class="attachment attachment--audio" controls preload="metadata" src="${url}"></audio><span class="attachment__caption">${escapeHtml(name)}</span>`
    }
    return `[[${name}]]`
  })
}

export function transformRedactions(
  source: string,
  classification: RenderOptions['classification'] = 'internal'
): string {
  const redacted = classification === 'classified'
  return source.replace(/^:::(redacted|secret)[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm, (_all, _kind: string, inner: string) => {
    if (!redacted) return inner.trim()
    const bars = inner
      .trim()
      .split(/\n/)
      .map((line) => (line.trim() ? '████████████████████████' : ''))
      .join('\n')
    return `<div class="redacted-block" role="note" aria-label="Redacted section">\n${bars || '████████████████████████'}\n</div>`
  })
}

export function renderMarkdown(source: string, options: RenderOptions = {}): string {
  const lookup = options.lookup === undefined ? createPageLookup(null) : options.lookup
  const classification = options.classification ?? 'internal'
  const body =
    options.stripFrontmatter === false ? source : parseFrontmatter(source).body
  const attachmentBody = transformAttachments(body)
  const calloutBody = transformRedactedCallouts(attachmentBody)
  const redactedBody = transformRedactions(calloutBody, classification)
  const transformed = transformWiki(redactedBody, { ...options, lookup })
  const raw = marked.parse(transformed, { async: false }) as string
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'textarea', 'select', 'option', 'link', 'meta', 'base', 'svg', 'math'],
    FORBID_ATTR: ['style', 'srcset', 'formaction', 'action', 'onerror', 'onload', 'onclick'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    USE_PROFILES: { html: true }
  })
  return clean
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
