import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUILD = resolve(ROOT, 'build')
const PUBLIC = resolve(ROOT, 'src', 'renderer', 'public')

const BG = [0x07, 0x0a, 0x0d]
const GRID = [0x1a, 0x25, 0x2e]
const BORDER = [0x26, 0x34, 0x3f]
const ACCENT = [0x4a, 0xf0, 0xd4]
const ACCENT_DIM = [0x2a, 0x9e, 0x8f]
const AMBER = [0xff, 0xb5, 0x47]

function renderIcon(size) {
  const SS = 4
  const W = size * SS
  const scale = (value) => Math.round((value / 256) * W)

  const pixels = new Uint8Array(W * W * 4)
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = BG[0]
    pixels[i + 1] = BG[1]
    pixels[i + 2] = BG[2]
  }

  function blend(x, y, color, alpha = 1) {
    if (x < 0 || y < 0 || x >= W || y >= W) return
    const i = (y * W + x) * 4
    const a = Math.max(0, Math.min(1, alpha))
    pixels[i] = Math.round(pixels[i] * (1 - a) + color[0] * a)
    pixels[i + 1] = Math.round(pixels[i + 1] * (1 - a) + color[1] * a)
    pixels[i + 2] = Math.round(pixels[i + 2] * (1 - a) + color[2] * a)
  }

  function fillRect(x0, y0, w, h, color, alpha = 1) {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) blend(x, y, color, alpha)
    }
  }

  // Faint archive grid.
  const cell = W / 8
  for (let i = 1; i < 8; i += 1) {
    fillRect(Math.round(i * cell), 0, Math.max(1, SS / 2), W, GRID, 0.45)
    fillRect(0, Math.round(i * cell), W, Math.max(1, SS / 2), GRID, 0.45)
  }

  // Outer plate.
  fillRect(scale(6), scale(6), W - scale(12), W - scale(12), BORDER, 0.35)
  fillRect(scale(10), scale(10), W - scale(20), W - scale(20), BG)

  // Open codex: two page panels with an amber spine.
  const pageTop = scale(58)
  const pageBottom = scale(198)
  const pageHeight = pageBottom - pageTop
  const leftX = scale(46)
  const spineX = scale(122)
  const spineW = scale(12)
  const rightX = scale(134)
  const pageW = scale(76)

  fillRect(leftX, pageTop, pageW, pageHeight, ACCENT_DIM, 0.9)
  fillRect(leftX + scale(6), pageTop + scale(6), pageW - scale(12), pageHeight - scale(12), ACCENT, 0.16)
  fillRect(spineX, pageTop, spineW, pageHeight, AMBER, 0.95)
  fillRect(rightX, pageTop, pageW, pageHeight, ACCENT_DIM, 0.9)
  fillRect(rightX + scale(6), pageTop + scale(6), pageW - scale(12), pageHeight - scale(12), ACCENT, 0.16)

  // Page fold marks.
  fillRect(leftX + pageW - scale(18), pageTop, scale(18), scale(18), ACCENT, 0.35)
  fillRect(rightX + pageW - scale(18), pageTop, scale(18), scale(18), ACCENT, 0.35)

  // Terminal caret on the right page.
  const caretX = rightX + scale(20)
  const caretY = scale(96)
  const caretSize = scale(14)
  for (let row = 0; row < 5; row += 1) {
    const offset = row < 3 ? row * scale(6) : (4 - row) * scale(6)
    const width = row === 2 ? scale(18) : scale(10)
    fillRect(caretX + offset, caretY + row * scale(6), width, scale(5), ACCENT, 0.95)
  }
  fillRect(caretX + scale(26), caretY + scale(30), scale(16), scale(5), ACCENT, 0.95)

  // Amber colony seal in the upper-right corner.
  const sealX = W - scale(58)
  const sealY = scale(42)
  const sealR = scale(18)
  for (let y = -sealR; y <= sealR; y += 1) {
    const span = Math.round(Math.sqrt(Math.max(0, sealR * sealR - y * y)))
    fillRect(sealX - span, sealY + y, span * 2, 1, AMBER, 0.85)
  }
  for (let y = -Math.round(sealR * 0.55); y <= Math.round(sealR * 0.55); y += 1) {
    const span = Math.round(Math.sqrt(Math.max(0, (sealR * 0.55) ** 2 - y * y)))
    fillRect(sealX - span, sealY + y, span * 2, 1, BG)
  }

  // Downsample.
  const out = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 4
          r += pixels[i]
          g += pixels[i + 1]
          b += pixels[i + 2]
        }
      }
      const n = SS * SS
      const o = (y * size + x) * 4
      out[o] = Math.round(r / n)
      out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n)
      out[o + 3] = 255
    }
  }
  return out
}

function encodePng(size, out) {
  const crcTable = (() => {
    const table = new Uint32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
    return table
  })()

  function crc32(buffer) {
    let c = 0xffffffff
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }

  function chunk(type, data) {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length, 0)
    const typeBuf = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
    return Buffer.concat([length, typeBuf, data, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0
    Buffer.from(out.buffer, out.byteOffset + y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function makeIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  const directory = Buffer.alloc(entries.length * 16)
  let offset = 6 + entries.length * 16
  const images = []

  entries.forEach((entry, index) => {
    const base = index * 16
    directory[base] = entry.size >= 256 ? 0 : entry.size
    directory[base + 1] = entry.size >= 256 ? 0 : entry.size
    directory[base + 2] = 0
    directory[base + 3] = 0
    directory.writeUInt16LE(1, base + 4)
    directory.writeUInt16LE(32, base + 6)
    directory.writeUInt32LE(entry.png.length, base + 8)
    directory.writeUInt32LE(offset, base + 12)
    images.push(entry.png)
    offset += entry.png.length
  })

  return Buffer.concat([header, directory, ...images])
}

mkdirSync(BUILD, { recursive: true })
mkdirSync(PUBLIC, { recursive: true })

const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icoEntries = icoSizes.map((size) => ({ size, png: encodePng(size, renderIcon(size)) }))
writeFileSync(resolve(BUILD, 'icon.ico'), makeIco(icoEntries))

const icon256 = encodePng(256, renderIcon(256))
const icon512 = encodePng(512, renderIcon(512))
writeFileSync(resolve(BUILD, 'icon.png'), icon256)
writeFileSync(resolve(BUILD, 'icon-512.png'), icon512)
writeFileSync(resolve(PUBLIC, 'rimcodex-icon.png'), icon256)

console.log(`wrote RimCodex icons: ${icoSizes.join(', ')}px`)