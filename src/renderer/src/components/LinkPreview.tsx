import type { IndexedPage } from '@shared/types'
import { formatRimDate, pageKind } from '@shared/wiki'

export interface LinkPreviewState {
  page: IndexedPage
  x: number
  y: number
}

export function LinkPreview({ state }: { state: LinkPreviewState }) {
  const { page } = state
  return (
    <div
      className="link-preview"
      style={{ left: state.x, top: state.y }}
      role="tooltip"
    >
      <div className="link-preview__head">
        <span className={`kind-dot kind-dot--${pageKind(page)}`} />
        <span className="link-preview__title">{page.title}</span>
        <span className="link-preview__kind">{pageKind(page)}</span>
      </div>
      <div className="link-preview__path">{page.path}</div>
      {page.date ? (
        <div className="link-preview__date">{formatRimDate(page.date)}</div>
      ) : null}
      {page.tags.length > 0 ? (
        <div className="link-preview__tags">
          {page.tags.slice(0, 6).map((tag) => (
            <span className="md-tag" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="link-preview__excerpt">
        {page.excerpt || 'No summary captured yet.'}
      </div>
      <div className="link-preview__foot">click to open record</div>
    </div>
  )
}
