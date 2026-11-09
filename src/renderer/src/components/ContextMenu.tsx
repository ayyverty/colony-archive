import { useEffect, useRef } from 'react'
import { useArchiveStore } from '../state/store'
import { basename, dirname } from '../lib/paths'

interface MenuItem {
  id: string
  label: string
  hint?: string
  danger?: boolean
  action: () => void
}

export function ContextMenu() {
  const target = useArchiveStore((state) => state.contextMenu)
  const tree = useArchiveStore((state) => state.tree)
  const setContextMenu = useArchiveStore((state) => state.setContextMenu)
  const promptNewPage = useArchiveStore((state) => state.promptNewPage)
  const promptNewFolder = useArchiveStore((state) => state.promptNewFolder)
  const promptRename = useArchiveStore((state) => state.promptRename)
  const promptDelete = useArchiveStore((state) => state.promptDelete)
  const convertPageType = useArchiveStore((state) => state.convertPageType)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!target) return
    const close = (): void => setContextMenu(null)
    const onPointerDown = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
    }
  }, [target, setContextMenu])

  if (!target) return null

  const node = (() => {
    const search = (current: typeof tree): typeof tree => {
      if (!current) return null
      if (current.path === target.path) return current
      for (const child of current.children ?? []) {
        const found = search(child)
        if (found) return found
      }
      return null
    }
    return search(tree)
  })()

  const isRoot = target.kind === 'root'
  const isFolder = target.kind === 'folder'
  const name = node?.name ?? basename(target.path)
  const dirPath = isFolder ? target.path : dirname(target.path)

  const items: MenuItem[] = [
    {
      id: 'new-page',
      label: 'New page',
      hint: 'Ctrl N',
      action: () => promptNewPage(dirPath)
    },
    {
      id: 'new-folder',
      label: 'New folder',
      hint: 'Ctrl ⇧ N',
      action: () => promptNewFolder(dirPath)
    }
  ]

  if (!isRoot) {
    items.push(
      {
        id: 'rename',
        label: 'Rename',
        hint: 'F2',
        action: () => promptRename(target.path, name)
      },
      {
        id: 'reveal',
        label: 'Reveal in explorer',
        action: () => {
          void window.api.reveal(target.path)
        }
      },
      {
        id: 'set-type',
        label: 'Set page type',
        action: () => {
          const type = window.prompt('Page type:', '')
          if (type) void convertPageType(target.path, type.trim(), false)
        }
      },
      {
        id: 'delete',
        label: 'Delete',
        danger: true,
        action: () => promptDelete(target.path, name, isFolder ? 'folder' : 'file')
      }
    )
  }

  const left = Math.min(target.x, Math.max(8, window.innerWidth - 224))
  const top = Math.min(target.y, Math.max(8, window.innerHeight - 40 - items.length * 30))

  return (
    <div className="context-menu" style={{ left, top }} ref={menuRef} role="menu">
      <div className="context-menu__header">
        {isRoot ? 'archive root' : name}
      </div>
      {items.map((item, index) => (
        <div key={item.id}>
          {item.id === 'delete' ? <div className="context-menu__sep" /> : null}
          <button
            type="button"
            role="menuitem"
            className={`context-menu__item ${item.danger ? 'context-menu__item--danger' : ''}`}
            onClick={() => {
              setContextMenu(null)
              item.action()
            }}
          >
            <span>{item.label}</span>
            {item.hint ? <span className="context-menu__hint">{item.hint}</span> : null}
          </button>
          {index === 1 && !isRoot ? <div className="context-menu__sep" /> : null}
        </div>
      ))}
    </div>
  )
}
