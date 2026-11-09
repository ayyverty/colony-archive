interface IconProps {
  size?: number
  className?: string
}

function frame(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  }
}

export function ChevronIcon({ size = 11, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

export function FolderIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M1.6 4.4h4.1l1.2 1.5h7.5v7.7H1.6z" />
    </svg>
  )
}

export function FileIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M3.6 1.5h5.6l3.2 3.2v9.8H3.6z" />
      <path d="M9.2 1.5v3.2h3.2" />
      <path d="M5.6 8h4.8M5.6 10.4h4.8" />
    </svg>
  )
}

export function PlusIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

export function FolderPlusIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M1.6 4.4h4.1l1.2 1.5h7.5v7.7H1.6z" />
      <path d="M8 8.2v3.6M6.2 10h3.6" />
    </svg>
  )
}

export function EyeIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M1.4 8S3.9 4.1 8 4.1 14.6 8 14.6 8 12.1 11.9 8 11.9 1.4 8 1.4 8Z" />
      <circle cx="8" cy="8" r="1.7" />
    </svg>
  )
}

export function MoonIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.7 5.7 0 1 0 6.8 6.8Z" />
    </svg>
  )
}

export function SunIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.4v1.8M8 12.8v1.8M1.4 8h1.8M12.8 8h1.8M3.3 3.3l1.3 1.3M11.4 11.4l1.3 1.3M12.7 3.3l-1.3 1.3M4.6 11.4l-1.3 1.3" />
    </svg>
  )
}

export function EyeOffIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M1.4 8S3.9 4.1 8 4.1 14.6 8 14.6 8 12.1 11.9 8 11.9 1.4 8 1.4 8Z" />
      <circle cx="8" cy="8" r="1.7" />
      <path d="M2.5 2.5l11 11" />
    </svg>
  )
}

export function SidebarIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <rect x="1.8" y="2.6" width="12.4" height="10.8" />
      <path d="M6 2.6v10.8" />
    </svg>
  )
}

export function SaveIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M2.6 2.2h8.1l2.7 2.7v8.9H2.6z" />
      <path d="M5.2 2.2v4h5.2v-4M5.2 13.8v-4h5.6v4" />
    </svg>
  )
}

export function TemplateIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <rect x="2.2" y="2.4" width="11.6" height="11.2" />
      <path d="M2.2 6h11.6M5.6 6v7.6" />
    </svg>
  )
}

export function StarIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
    </svg>
  )
}

export function WarningIcon({ size = 12, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M8 1.8 15 14H1z" />
      <path d="M8 5.8v4M8 11.8v.2" />
    </svg>
  )
}

export function MinusIcon({ size = 10, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M2.5 8h11" />
    </svg>
  )
}

export function MaximizeIcon({ size = 10, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <rect x="2.8" y="2.8" width="10.4" height="10.4" />
    </svg>
  )
}

export function RestoreIcon({ size = 10, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <rect x="2.2" y="4.6" width="8.2" height="8.2" />
      <path d="M5.6 4.6V2.2h8.2v8.2h-2.4" />
    </svg>
  )
}

export function CloseIcon({ size = 10, className }: IconProps) {
  return (
    <svg {...frame(size)} className={className}>
      <path d="M3 3l10 10M13 3 3 13" />
    </svg>
  )
}
