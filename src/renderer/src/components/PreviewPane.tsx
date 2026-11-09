import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useArchiveStore, isDashboard } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { renderMarkdown, slugify } from '../lib/markdown'
import { parseFrontmatter } from '@shared/frontmatter'
import { StampBadge } from './StampBadge'
import { createPageLookup } from '@shared/wiki'
import { dirname, findNode, resolveRelative } from '../lib/paths'
import { CloseIcon } from './Icons'
import { DashboardView } from './DashboardView'
import { LinkPreview } from './LinkPreview'
import { ArchiveHeader } from './ArchiveHeader'
import { FrontmatterHint } from './FrontmatterHint'
import { RelatedNudge } from './RelatedNudge'
import { DossierCard } from './DossierCard'
import { RelationshipsPanel } from './RelationshipsPanel'
import { ArtifactCard } from './ArtifactCard'
import { JourneyCard } from './JourneyCard'
import { SourceAttribution } from './SourceAttribution'
import { SignOff } from './SignOff'
import type { LinkPreviewState } from './LinkPreview'

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function PreviewPane() {
  const visible = useArchiveStore((state) => state.previewVisible)
  const selected = useArchiveStore((state) => state.selected)
  const tree = useArchiveStore((state) => state.tree)
  const index = useArchiveStore((state) => state.index)
  const draft = useArchiveStore((state) => (state.selected ? state.drafts[state.selected] : undefined))
  const togglePreview = useArchiveStore((state) => state.togglePreview)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const pushToast = useArchiveStore((state) => state.pushToast)
  const [hover, setHover] = useState<LinkPreviewState | null>(null)

  const source = draft ?? ''
  const debounced = useDebouncedValue(source, 200)
  const lookup = useMemo(() => createPageLookup(index), [index])
  const page = selected ? lookup.get(selected) : undefined
  const parsedFrontmatter = useMemo(() => parseFrontmatter(debounced), [debounced])
  const html = useMemo(
    () =>
      renderMarkdown(debounced, {
        lookup,
        fromPath: selected ?? '',
        classification: page?.classification
      }),
    [debounced, lookup, selected, page?.classification]
  )
  const articleRef = useRef<HTMLElement>(null)
  const splitRatio = useArchiveStore((state) => state.splitRatio)
  const focusedPane = useArchiveStore((state) => state.focusedPane)
  const setFocusedPane = useArchiveStore((state) => state.setFocusedPane)

  useEffect(() => {
    setHover(null)
  }, [selected])

  useEffect(() => {
    const article = articleRef.current
    if (!article) return

    const used = new Set<string>()
    article.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading, index) => {
      let id = heading.id || slugify(heading.textContent ?? '') || `section-${index + 1}`
      if (used.has(id)) id = `${id}-${index + 1}`
      used.add(id)
      heading.id = id
    })

    article.querySelectorAll('a[href]').forEach((anchor) => {
      anchor.setAttribute('rel', 'noreferrer noopener')
    })
  }, [html, selected])

  if (!visible) return null

  const onContentClick = (event: MouseEvent<HTMLDivElement>): void => {
    const element = event.target
    if (!(element instanceof Element)) return
    const anchor = element.closest('a')
    if (!anchor) return

    const createTarget = anchor.getAttribute('data-wiki-create')
    if (createTarget) {
      event.preventDefault()
      const store = useArchiveStore.getState()
      const dir = store.selected ? dirname(store.selected) : ''
      store.openNewPagePicker(dir)
      return
    }

    const href = anchor.getAttribute('href') ?? ''
    if (!href) return
    event.preventDefault()

    if (href.startsWith('#')) {
      const id = decodePath(href.slice(1))
      const target = articleRef.current?.querySelector(`#${CSS.escape(id)}`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (/^https?:\/\//i.test(href)) {
      void window.api.openExternal(href).then((result) => {
        if (!result.ok) pushToast('error', result.error)
      })
      return
    }

    if (/\.md($|#)/i.test(href)) {
      const [rawPath, rawHash] = href.split('#')
      if (!rawPath) return
      const base = selected ? dirname(selected) : ''
      const resolved = resolveRelative(base, decodePath(rawPath))
      const node = findNode(tree, resolved)
      if (node?.kind === 'file') {
        void selectPath(resolved).then(() => {
          if (rawHash) {
            const id = decodePath(rawHash)
            window.setTimeout(() => {
              articleRef.current
                ?.querySelector(`#${CSS.escape(id)}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 60)
          }
        })
      } else {
        pushToast('info', `Record not found: ${resolved}`)
      }
      return
    }

    pushToast('info', 'Only http, https and archive links can be opened.')
  }

  const onMouseOver = (event: MouseEvent<HTMLDivElement>): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a.wikilink')
    if (!anchor || !selected) {
      setHover(null)
      return
    }
    const href = anchor.getAttribute('href')
    if (!href) {
      setHover(null)
      return
    }
    const [rawPath] = href.split('#')
    const resolved = resolveRelative(dirname(selected), decodePath(rawPath))
    const page = lookup.get(resolved)
    if (!page) {
      setHover(null)
      return
    }
    const rect = anchor.getBoundingClientRect()
    setHover({
      page,
      x: Math.min(window.innerWidth - 320, Math.max(12, rect.left)),
      y: Math.min(window.innerHeight - 190, rect.bottom + 8)
    })
  }

  const dashboard = isDashboard(selected)

  return (
    <aside
      className={`preview-pane ${focusedPane === 'preview' ? 'pane--focused' : ''}`}
      style={{ flex: `0 0 calc(${(1 - splitRatio) * 100}% - 5px)` }}
      onFocusCapture={() => setFocusedPane('preview')}
      onPointerDown={() => setFocusedPane('preview')}
    >
      <div className="pane-header">
        <span className="pane-header__title">
          {focusedPane === 'preview' ? <span className="pane-header__focus">▸ </span> : null}
          {dashboard ? 'Dashboard' : 'Preview'}
        </span>
        <div className="pane-header__spacer" />
        <span className="pane-header__hint">{dashboard ? 'live index' : 'sanitized'}</span>
        <button
          type="button"
          className="icon-btn"
          title="Hide preview (Ctrl+P)"
          onClick={togglePreview}
        >
          <CloseIcon />
        </button>
      </div>

      <div
        className="preview-scroll"
        onClick={onContentClick}
        onMouseOver={onMouseOver}
        onMouseLeave={() => setHover(null)}
      >
        {selected ? <FrontmatterHint path={selected} /> : null}
        {selected ? <ArchiveHeader classification={page?.classification} /> : null}
        {!selected ? (
          <div className="preview-empty">No record selected</div>
        ) : dashboard ? (
          <DashboardView />
        ) : (
          <>
            <SourceAttribution />
            <RelationshipsPanel />
            <ArtifactCard />
            <DossierCard />
            <JourneyCard />
            <StampBadge />
            <article
              className={`markdown ${
                String(parsedFrontmatter.data.scanned ?? '').toLowerCase() === 'true' || parsedFrontmatter.data.style === 'scanned'
                  ? 'markdown--scanned'
                  : ''
              } ${
                parsedFrontmatter.data.type === 'handwritten' || parsedFrontmatter.data.style === 'handwritten'
                  ? 'markdown--handwritten'
                  : ''
              }`}
              ref={articleRef}
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <SignOff />
            {selected ? <RelatedNudge path={selected} /> : null}
          </>
        )}
      </div>

      {hover ? <LinkPreview state={hover} /> : null}
    </aside>
  )
}
