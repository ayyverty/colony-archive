import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * The dev server needs inline scripts for React Fast Refresh, so the strict CSP
 * is only injected into the production HTML.
 */
const productionCsp: Plugin = {
  name: 'colony-inject-production-csp',
  transformIndexHtml(html, ctx) {
    if (ctx.server) return html
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ].join('; ')
    return html.replace(
      '</head>',
      `    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`
    )
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    }
  },
  renderer: {
    root: resolve('src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react(), productionCsp],
    build: {
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html') },
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react'
            if (id.includes('node_modules/@codemirror')) return 'codemirror'
            if (id.includes('node_modules/marked') || id.includes('node_modules/dompurify')) return 'markdown'
            if (id.includes('node_modules/zustand')) return 'state'
            return undefined
          }
        }
      }
    }
  }
})
