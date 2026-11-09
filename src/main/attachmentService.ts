import { promises as fs } from 'node:fs'
import path from 'node:path'
import { PathValidationError } from './paths'

const ATTACHMENTS_DIR = '_attachments'
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ogg',
  '.mp3',
  '.wav',
  '.m4a',
  '.flac'
])

export interface AttachmentSaveResult {
  name: string
  size: number
  kind: 'image' | 'audio'
}

export function attachmentKindFor(name: string): 'image' | 'audio' | null {
  const ext = path.extname(name).toLowerCase()
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return 'image'
  if (['.ogg', '.mp3', '.wav', '.m4a', '.flac'].includes(ext)) return 'audio'
  return null
}

export function sanitizeAttachmentName(rawName: unknown): string {
  if (typeof rawName !== 'string' || !rawName.trim()) {
    throw new PathValidationError('Attachment name must be text.')
  }
  const base = path.basename(rawName).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
  const ext = path.extname(base).toLowerCase()
  const stem = base.slice(0, base.length - ext.length).replace(/[. ]+$/g, '')
  if (!stem) throw new PathValidationError('Attachment name is empty.')
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new PathValidationError('Unsupported attachment type.')
  }
  if (stem.length > 80) throw new PathValidationError('Attachment name is too long.')
  return `${stem}${ext}`
}

export async function saveAttachment(root: string, rawName: unknown, data: ArrayBuffer): Promise<AttachmentSaveResult> {
  const name = sanitizeAttachmentName(rawName)
  const kind = attachmentKindFor(name)
  if (!kind) throw new PathValidationError('Unsupported attachment type.')

  const buffer = Buffer.from(data)
  if (buffer.byteLength === 0) throw new PathValidationError('Attachment is empty.')
  if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new PathValidationError('Attachment is too large (20 MB limit).')
  }

  const directory = path.join(root, ATTACHMENTS_DIR)
  await fs.mkdir(directory, { recursive: true })

  let targetName = name
  const targetPath = path.join(directory, targetName)
  try {
    const existing = await fs.readFile(targetPath)
    if (existing.equals(buffer)) {
      const stat = await fs.stat(targetPath)
      return { name: targetName, size: stat.size, kind }
    }
  } catch {
    // File does not exist yet.
  }

  let candidate = targetPath
  let suffix = 1
  while (true) {
    try {
      await fs.access(candidate)
      suffix += 1
      const ext = path.extname(name)
      const stem = name.slice(0, name.length - ext.length)
      candidate = path.join(directory, `${stem}-${suffix}${ext}`)
    } catch {
      break
    }
  }
  targetName = path.basename(candidate)

  await fs.writeFile(candidate, buffer)
  const stat = await fs.stat(candidate)
  return { name: targetName, size: stat.size, kind }
}

export function attachmentMimeType(name: string): string {
  const ext = path.extname(name).toLowerCase()
  switch (ext) {
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.gif': return 'image/gif'
    case '.webp': return 'image/webp'
    case '.ogg': return 'audio/ogg'
    case '.mp3': return 'audio/mpeg'
    case '.wav': return 'audio/wav'
    case '.m4a': return 'audio/mp4'
    case '.flac': return 'audio/flac'
    default: return 'application/octet-stream'
  }
}

export function attachmentPath(root: string, name: string): string {
  const safe = sanitizeAttachmentName(name)
  return path.join(root, ATTACHMENTS_DIR, safe)
}