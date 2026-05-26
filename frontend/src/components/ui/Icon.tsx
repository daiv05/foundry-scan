/**
 * RawBlock Icon — wraps @mdi/js path data into a 24×24 SVG.
 * Always renders in the current text color (the "principal color").
 *
 * Usage:
 *   import { mdiCog } from '@mdi/js'
 *   <Icon path={mdiCog} size={20} />
 */

interface IconProps {
  path: string
  size?: number
  className?: string
  title?: string
}

export default function Icon({ path, size = 20, className = '', title }: IconProps) {
  return (
    <svg
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 fill-current ${className}`}
    >
      {title && <title>{title}</title>}
      <path d={path} />
    </svg>
  )
}
