import { spawn } from 'node:child_process'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * End-to-end smoke test.
 *
 * Launches the built Electron app against a temporary archive, attaches to the
 * renderer over the Chrome DevTools Protocol, and verifies the UI, save flow,
 * theme/preview toggles, IPC path guards and preview sanitization.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const electronBinary =
  process.platform === 'win32'
    ? path.join(projectRoot, 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(projectRoot, 'node_modules', '.bin', 'electron')

// Point COLONY_SMOKE_EXE at a packaged build to smoke test the real artifact.
const packagedExe = process.env.COLONY_SMOKE_EXE
  ? path.resolve(process.env.COLONY_SMOKE_EXE)
  : null
const executable = packagedExe ?? electronBinary

const checks = []
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail })
  const mark = condition ? 'PASS' : 'FAIL'
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ''}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(fn, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      last = await fn()
      if (last) return last
    } catch (err) {
      last = err
    }
    await sleep(120)
  }
  throw new Error(`Timed out waiting for ${label}${last instanceof Error ? `: ${last.message}` : ''}`)
}

class Cdp {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(message.error.message))
        else resolve(message.result)
        return
      }
      const handlers = this.listeners.get(message.method) ?? []
      for (const handler of handlers) handler(message.params)
    })
  }

  on(method, handler) {
    if (!this.listeners.has(method)) this.listeners.set(method, [])
    this.listeners.get(method).push(handler)
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP timeout: ${method}`))
      }, 20000)
    })
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    })
    if (result.exceptionDetails) {
      const detail =
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        'evaluation failed'
      throw new Error(detail)
    }
    return result.result.value
  }

  close() {
    try {
      this.socket.close()
    } catch {
      // ignore
    }
  }
}

async function connect(port) {
  const deadline = Date.now() + 40000
  let lastError = 'no page target yet'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      const targets = await response.json()
      const page = targets.find(
        (target) => target.type === 'page' && target.webSocketDebuggerUrl
      )
      if (page) {
        const socket = new WebSocket(page.webSocketDebuggerUrl)
        await new Promise((resolve, reject) => {
          socket.addEventListener('open', resolve, { once: true })
          socket.addEventListener('error', () => reject(new Error('WebSocket failed')), {
            once: true
          })
        })
        return new Cdp(socket)
      }
    } catch (err) {
      lastError = err.message
    }
    await sleep(250)
  }
  throw new Error(`Could not attach to the app: ${lastError}`)
}

async function pressKey(cdp, { key, code, vk, modifiers = 0 }) {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    modifiers,
    key,
    code,
    windowsVirtualKeyCode: vk,
    nativeVirtualKeyCode: vk
  })
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    modifiers,
    key,
    code,
    windowsVirtualKeyCode: vk,
    nativeVirtualKeyCode: vk
  })
}

async function main() {
  assert(existsSync(path.join(projectRoot, 'out', 'main', 'index.js')), 'Run `npm run build` first.')
  assert(existsSync(executable), `Electron binary missing at ${executable}`)

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'colony-smoke-'))
  const archive = path.join(tempRoot, 'archive')
  const userData = path.join(tempRoot, 'user-data')
  const port = 9300 + Math.floor(Math.random() * 400)

  await fs.mkdir(path.join(archive, 'Factions'), { recursive: true })
  await fs.mkdir(userData, { recursive: true })

  await fs.writeFile(
    path.join(archive, 'Home.md'),
    '# Home\n\nWelcome to the colony archive.\n\n## Log\n\n- Day 1: landed\n',
    'utf8'
  )
  await fs.writeFile(
    path.join(archive, 'Factions', 'Empire.md'),
    '# Empire\n\nA faction record.\n',
    'utf8'
  )
  await fs.writeFile(
    path.join(archive, 'Xss.md'),
    [
      '# XSS test',
      '',
      '<script>window.__xss = true</script>',
      '<img src="missing.png" onerror="window.__xssImg = true">',
      '',
      '[bad link](javascript:window.__xssLink = true)',
      ''
    ].join('\n'),
    'utf8'
  )
  await fs.writeFile(
    path.join(archive, 'ignore.txt'),
    'not a markdown record',
    'utf8'
  )

  await fs.writeFile(
    path.join(userData, 'config.json'),
    JSON.stringify(
      {
        rootPath: archive,
        theme: 'dark',
        previewVisible: true,
        sidebarVisible: true,
        splitRatio: 0.5,
        bootSequence: false,
        linter: true,
        autosave: false,
        typewriterScroll: false
      },
      null,
      2
    ),
    'utf8'
  )

  console.log(`\nLaunching ${packagedExe ? 'packaged app' : 'Electron'} (port ${port}) against ${archive}\n`)

  const launchArgs = [
    ...(packagedExe ? [] : ['.']),
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    '--disable-gpu'
  ]

  const child = spawn(
    executable,
    launchArgs,
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        COLONY_USER_DATA: userData,
        ELECTRON_DISABLE_SECURITY_WARNINGS: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    }
  )

  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  let cdp
  const consoleErrors = []
  const exceptions = []
  const logErrors = []

  try {
    cdp = await connect(port)

    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        consoleErrors.push(
          params.args.map((arg) => arg.value ?? arg.description ?? '?').join(' ')
        )
      }
    })
    cdp.on('Runtime.exceptionThrown', (params) => {
      exceptions.push(
        params.exceptionDetails.exception?.description ?? params.exceptionDetails.text
      )
    })
    cdp.on('Log.entryAdded', (params) => {
      if (params.entry.level === 'error') {
        logErrors.push(
          `${params.entry.text} [${params.entry.source} ${params.entry.url ?? ''}:${
            params.entry.lineNumber ?? ''
          } @ ${new Date(params.entry.timestamp).toISOString()}]`
        )
      }
    })

    await cdp.send('Runtime.enable')
    await cdp.send('Log.enable')
    await cdp.send('Page.enable')
    await cdp.send('Page.reload', { ignoreCache: true })

    await waitFor(
      () =>
        cdp.evaluate(
          "document.readyState === 'complete' && document.querySelectorAll('.tree-row').length > 0"
        ),
      20000,
      'the archive tree'
    )

    // ── Bridge surface ───────────────────────────────────────────────────
    const bridge = await cdp.evaluate(`(() => ({
      api: typeof window.api,
      require: typeof window.require,
      process: typeof window.process,
      module: typeof window.module,
      ipc: typeof window.ipcRenderer
    }))()`)
    check('preload exposes window.api', bridge.api === 'object', bridge.api)
    check('no window.require', bridge.require === 'undefined', bridge.require)
    check('no window.process', bridge.process === 'undefined', bridge.process)
    check('no window.module', bridge.module === 'undefined', bridge.module)
    check('no window.ipcRenderer', bridge.ipc === 'undefined', bridge.ipc)

    const labels = await cdp.evaluate(
      "[...document.querySelectorAll('.tree-row__label')].map((el) => el.textContent)"
    )
    check(
      'tree lists folders and .md files',
      labels.includes('Home.md') &&
        labels.includes('Xss.md') &&
        labels.includes('Factions') &&
        !labels.includes('ignore.txt'),
      labels.join(', ')
    )

    // ── Open a record, live preview ──────────────────────────────────────
    await cdp.evaluate(
      "[...document.querySelectorAll('.tree-row')].find((row) => row.textContent.includes('Home.md')).click()"
    )
    await waitFor(
      () =>
        cdp.evaluate(
          "Boolean(document.querySelector('.cm-editor')) && (document.querySelector('.markdown')?.textContent ?? '').includes('Welcome to the colony archive')"
        ),
      15000,
      'the editor and preview'
    )
    check('editor mounts for a record', await cdp.evaluate("Boolean(document.querySelector('.cm-editor'))"))
    check(
      'preview renders sanitized Markdown',
      await cdp.evaluate(
        "(document.querySelector('.markdown')?.innerHTML ?? '').includes('<h1')"
      )
    )

    const marker = `SMOKE_${Date.now().toString(36)}`
    await cdp.evaluate("document.querySelector('.cm-content').focus()")
    await cdp.send('Input.insertText', { text: `${marker} ` })
    await waitFor(
      () =>
        cdp.evaluate(
          `(document.querySelector('.cm-content')?.textContent ?? '').includes(${JSON.stringify(marker)})`
        ),
      8000,
      'typed text in CodeMirror'
    )
    await waitFor(
      () =>
        cdp.evaluate(
          `(document.querySelector('.markdown')?.textContent ?? '').includes(${JSON.stringify(marker)})`
        ),
      8000,
      'live preview update'
    )
    check('live preview updates while typing', true)

    const dirtyStatus = await cdp.evaluate(
      "document.querySelector('.statusbar__group')?.textContent ?? ''"
    )
    check('status bar reports modified state', /MODIFIED|AUTOSAVING/i.test(dirtyStatus), dirtyStatus.trim())

    // ── Ctrl+S atomic save ───────────────────────────────────────────────
    await pressKey(cdp, { key: 's', code: 'KeyS', vk: 83, modifiers: 2 })
    await waitFor(
      async () => {
        const onDisk = await fs.readFile(path.join(archive, 'Home.md'), 'utf8')
        return onDisk.includes(marker)
      },
      10000,
      'saved content on disk'
    )
    const saved = await fs.readFile(path.join(archive, 'Home.md'), 'utf8')
    check('Ctrl+S writes the record to disk', saved.includes(marker))
    check(
      'save leaves no temp files behind',
      (await fs.readdir(archive)).every((entry) => !entry.endsWith('.tmp'))
    )
    await waitFor(
      () => cdp.evaluate("/SAVED/i.test(document.querySelector('.statusbar__group')?.textContent ?? '')"),
      6000,
      'saved status'
    )
    check('status bar returns to saved state', true)

    // ── Theme toggle + persistence ───────────────────────────────────────
    const initialTheme = await cdp.evaluate('document.documentElement.dataset.theme')
    check('configured dark theme applies', initialTheme === 'dark', initialTheme)

    await cdp.evaluate("document.querySelector('.titlebar__toggle[title^=\"Theme\"]').click()")
    await waitFor(
      () => cdp.evaluate("document.documentElement.dataset.theme === 'light'"),
      6000,
      'light theme'
    )
    check('theme toggle switches to light', true)

    await waitFor(
      async () => {
        try {
          const config = JSON.parse(await fs.readFile(path.join(userData, 'config.json'), 'utf8'))
          return config.theme === 'light'
        } catch {
          return false
        }
      },
      6000,
      'theme persisted to config'
    )
    check('theme choice persists to config.json', true)

    await cdp.evaluate("document.querySelector('.titlebar__toggle[title^=\"Theme\"]').click()")
    await waitFor(
      () => cdp.evaluate("document.documentElement.dataset.theme === 'dark'"),
      6000,
      'dark theme restored'
    )

    // ── Ctrl+P preview toggle ────────────────────────────────────────────
    await pressKey(cdp, { key: 'p', code: 'KeyP', vk: 80, modifiers: 2 })
    await waitFor(
      () => cdp.evaluate("!document.querySelector('.preview-pane')"),
      6000,
      'preview to hide'
    )
    check('Ctrl+P hides the preview', true)

    await pressKey(cdp, { key: 'p', code: 'KeyP', vk: 80, modifiers: 2 })
    await waitFor(
      () => cdp.evaluate("Boolean(document.querySelector('.preview-pane'))"),
      6000,
      'preview to return'
    )
    check('Ctrl+P restores the preview', true)

    // ── Sanitization ─────────────────────────────────────────────────────
    await cdp.evaluate(
      "[...document.querySelectorAll('.tree-row')].find((row) => row.textContent.includes('Xss.md')).click()"
    )
    await waitFor(
      () =>
        cdp.evaluate(
          "(document.querySelector('.markdown')?.textContent ?? '').includes('XSS test')"
        ),
      8000,
      'the XSS fixture preview'
    )
    await sleep(350)

    const xss = await cdp.evaluate(`(() => {
      const article = document.querySelector('.markdown')
      return {
        scriptRan: window.__xss === true,
        imageHandlerRan: window.__xssImg === true,
        linkHandlerRan: window.__xssLink === true,
        scriptTags: article ? article.querySelectorAll('script').length : -1,
        eventAttrs: article
          ? [...article.querySelectorAll('*')].filter((el) =>
              [...el.attributes].some((attr) => /^on/i.test(attr.name))
            ).length
          : -1,
        javascriptHrefs: article
          ? [...article.querySelectorAll('a')].filter((a) =>
              (a.getAttribute('href') ?? '').toLowerCase().startsWith('javascript:')
            ).length
          : -1
      }
    })()`)
    check('inline <script> never executes', xss.scriptRan === false && xss.scriptTags === 0)
    check('img onerror handler is stripped', xss.imageHandlerRan === false)
    check('javascript: link does not execute', xss.linkHandlerRan === false && xss.javascriptHrefs === 0)
    check('no event handler attributes survive', xss.eventAttrs === 0, String(xss.eventAttrs))

    // ── IPC path guards ──────────────────────────────────────────────────
    const guards = await cdp.evaluate(`(async () => {
      const calls = {
        traversal: await window.api.readFile('../../etc/passwd'),
        backslashTraversal: await window.api.readFile('..\\\\..\\\\Windows\\\\win.ini'),
        absolute: await window.api.readFile('C:/Windows/win.ini'),
        writeEscape: await window.api.writeFile('../escape.md', 'nope'),
        createEscape: await window.api.createFile('..', 'escape.md'),
        javascript: await window.api.openExternal('javascript:alert(1)'),
        fileUrl: await window.api.openExternal('file:///C:/Windows/win.ini')
      }
      return Object.fromEntries(
        Object.entries(calls).map(([key, value]) => [key, value.ok])
      )
    })()`)

    for (const [name, ok] of Object.entries(guards)) {
      check(`IPC rejects ${name}`, ok === false, `ok=${ok}`)
    }
    check(
      'no escape file was created outside the archive',
      !existsSync(path.join(tempRoot, 'escape.md'))
    )

    // ── Console health ───────────────────────────────────────────────────
    const relevantLogErrors = logErrors.filter(
      (text) => !/Failed to load resource|ERR_FILE_NOT_FOUND/i.test(text)
    )
    const relevantConsoleErrors = consoleErrors.filter(
      (text) => !/Failed to load resource|ERR_FILE_NOT_FOUND/i.test(text)
    )
    check(
      'no uncaught renderer exceptions',
      exceptions.length === 0,
      exceptions.slice(0, 2).join(' | ')
    )
    check(
      'no console errors',
      relevantConsoleErrors.length === 0,
      relevantConsoleErrors.slice(0, 2).join(' | ')
    )
    check(
      'no log errors',
      relevantLogErrors.length === 0,
      relevantLogErrors.slice(0, 2).join(' | ')
    )

    // ── Clean shutdown ───────────────────────────────────────────────────
    await cdp.evaluate('window.api.windowForceClose()').catch(() => undefined)
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      sleep(6000)
    ])
  } finally {
    cdp?.close()
    if (child.exitCode === null && !child.killed) {
      child.kill()
      await sleep(300)
    }
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined)
  }

  const failed = checks.filter((entry) => !entry.ok)
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length > 0) {
    if (stderr.trim()) console.error(`\nElectron stderr:\n${stderr.trim()}`)
    throw new Error(`${failed.length} smoke check(s) failed: ${failed.map((f) => f.name).join(', ')}`)
  }
  console.log('Smoke test passed.\n')
}

main().catch((error) => {
  console.error(`\nSmoke test failed: ${error.message}\n`)
  process.exitCode = 1
})
