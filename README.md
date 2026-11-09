# RimCodex

A local-first desktop Markdown terminal for RimWorld colony records. Flat chrome,
monospaced labels, hairline borders, one cyan accent. Records are ordinary `.md`
files in a folder you choose; nothing leaves the machine.

Built with Electron, React, Vite and CodeMirror 6.

## Requirements

- Node.js 20.19+ or 22.12+
- Windows 10/11 for the packaged installer (development works on macOS/Linux too)

## Commands

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm install`       | Install dependencies                                     |
| `npm run dev`       | Start the Vite dev server with Electron                  |
| `npm run build`     | Typecheck, then build main, preload and renderer         |
| `npm start`         | Preview the production build                             |
| `npm test`          | Run the Vitest suite (path safety, fs service)           |
| `npm run smoke`     | Drive the built app over CDP and verify the UI/security  |
| `npm run dist`      | Build and package an NSIS installer + portable x64 exe   |
| `npm run dist:dir`  | Package an unpacked directory (faster smoke check)       |
| `node scripts/make-icon.mjs` | Regenerate `build/icon.ico`                     |

Build output lands in `out/`; packaged artifacts in `dist/`.

## First launch

The app asks you to mount a folder. That folder becomes the archive root and the
choice is persisted in `%APPDATA%/RimCodex/config.json` (or the platform
equivalent). Use **Archive → Open colony folder** (`Ctrl+O`) to switch roots.

The tree lists directories and `.md` files only. Dotfiles, `node_modules`,
`.git`, `.obsidian`, `.vscode` and symlinked directories are skipped.

## Shortcuts

| Shortcut          | Action                       |
| ----------------- | ---------------------------- |
| `Ctrl/Cmd+S`      | Save the current record      |
| `Ctrl/Cmd+P`      | Toggle preview               |
| `Ctrl/Cmd+B`      | Toggle sidebar               |
| `Ctrl/Cmd+N`      | New page                     |
| `Ctrl/Cmd+Shift+N`| New folder                   |
| `Ctrl/Cmd+O`      | Open colony folder           |
| `Ctrl/Cmd+Shift+T`| Toggle dark/light theme      |
| `Ctrl/Cmd+Shift+L`| Toggle the heading linter    |
| `F2`              | Rename the selected entry    |

Right-click any tree row for new page, new folder, rename, reveal and delete.
Delete moves entries to the system recycle bin rather than unlinking them.

## Security model

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- The renderer sees only a narrow, typed `window.api` bridge exposed by the
  preload via `contextBridge`; there is no `require`, `process` or raw `fs`.
- Every filesystem call runs in the main process. Renderer paths are
  **root-relative POSIX paths** and are normalized in `src/main/paths.ts`:
  absolute paths, drive letters, UNC paths, NUL bytes and `..` segments are
  rejected before touching disk.
- Containment is checked twice: lexically, and after `realpath`, so symlinks or
  junctions cannot escape the archive root.
- Saves are atomic: a temp file is written, fsynced and renamed over the target.
- Markdown preview is rendered with `marked` and sanitized by DOMPurify against
  an explicit tag/attribute allowlist. Scripts, event handlers, styles, frames,
  forms and embedded objects are stripped.
- External links are opened only for `http:`/`https:` via `shell.openExternal`.
  In-page anchors and relative `.md` links navigate inside the app.
- New windows, webviews, navigation and permission requests are denied.
- IPC handlers verify the sender frame is the app's own renderer.

## Project layout

```
src/
  main/       Electron main process
    paths.ts      path normalization, containment, name validation
    fsService.ts  tree scan, atomic read/write, create/rename/delete
    config.ts     persisted settings
    ipc.ts        IPC handlers, folder dialog, watcher
    menu.ts       application menu
    index.ts      window creation and lifecycle
  preload/    contextBridge API (dependency-free for sandbox)
  renderer/   React UI
    src/components/  title bar, tree, editor, preview, dialogs
    src/lib/         markdown pipeline, lint, theme, helpers
    src/state/       zustand store
    src/styles/      tokens, chrome, panes, preview, overlays
  shared/     IPC channel names and types shared by all three layers
tests/        Vitest suites
scripts/      icon generator, end-to-end smoke test
```

## Tests

`npm test` covers traversal and absolute-path rejection, symlink escape attempts,
Windows reserved names, tree filtering, atomic writes, and create/rename/delete
helpers.

`node scripts/smoke.mjs` launches the built app against a temporary archive and
drives it over the Chrome DevTools Protocol. It verifies rendering, navigation,
save, theme switching, preview toggling, the IPC path guards and sanitization.
