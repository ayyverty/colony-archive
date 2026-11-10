import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUILD = resolve(ROOT, 'build')
const ICONS = resolve(BUILD, 'icons')
const PUBLIC = resolve(ROOT, 'src', 'renderer', 'public')

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
mkdirSync(ICONS, { recursive: true })
mkdirSync(PUBLIC, { recursive: true })

const icoSizes = [16, 24, 32, 48, 64, 128, 256]

// Check if pre-rendered multi-resolution icon PNGs exist in build/icons
const hasAllIcons = icoSizes.every((sz) => existsSync(resolve(ICONS, `icon-${sz}.png`)))

if (hasAllIcons) {
  const icoEntries = icoSizes.map((size) => ({
    size,
    png: readFileSync(resolve(ICONS, `icon-${size}.png`))
  }))

  writeFileSync(resolve(BUILD, 'icon.ico'), makeIco(icoEntries))

  const icon256Path = resolve(ICONS, 'icon-256.png')
  const icon512Path = resolve(ICONS, 'icon-512.png')

  if (existsSync(icon256Path)) {
    copyFileSync(icon256Path, resolve(BUILD, 'icon.png'))
    copyFileSync(icon256Path, resolve(PUBLIC, 'rimcodex-icon.png'))
  }

  if (existsSync(icon512Path)) {
    copyFileSync(icon512Path, resolve(BUILD, 'icon-512.png'))
  }

  console.log(`Packaged RimCodex icons into icon.ico: ${icoSizes.join(', ')}px`)
} else {
  console.error(`Missing icon sources in ${ICONS}`)
  process.exit(1)
}
