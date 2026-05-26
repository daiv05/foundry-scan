/**
 * RawBlock Chips — theme-aware:
 *  - Chip (filter): toggle filter chip (active = inverted)
 *  - StatusChip: semantic status (active/warning/error/default)
 */

import type { ReactNode, ButtonHTMLAttributes } from 'react'

// ── Filter Chip ──────────────────────────────────────────────────────────

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

export function Chip({ active, className = '', children, ...rest }: ChipProps) {
  return (
    <button
      className={
        `inline-flex items-center px-[12px] py-[4px] border-[2px] border-rb-fg ` +
        `uppercase text-[10px] tracking-[1px] font-semibold cursor-pointer ` +
        `transition-none ` +
        `${active ? 'bg-rb-fg text-rb-bg' : 'bg-rb-bg text-rb-fg hover:bg-rb-fg hover:text-rb-bg'} ` +
        `${className}`
      }
      {...rest}
    >
      {children}
    </button>
  )
}

// ── Status Chip ──────────────────────────────────────────────────────────

type StatusKind = 'active' | 'warning' | 'error' | 'default'

interface StatusChipProps {
  kind?: StatusKind
  children: ReactNode
  className?: string
}

const STATUS_STYLES: Record<StatusKind, string> = {
  active:  'border-rb-success text-rb-success',
  warning: 'border-rb-warning text-rb-warning',
  error:   'border-rb-error text-rb-error',
  default: 'border-rb-fg text-rb-fg',
}

export function StatusChip({ kind = 'default', children, className = '' }: StatusChipProps) {
  return (
    <span
      className={
        `inline-flex items-center bg-rb-bg border-[2px] px-[10px] py-[2px] ` +
        `uppercase text-[11px] tracking-[1px] font-semibold ` +
        `${STATUS_STYLES[kind]} ${className}`
      }
    >
      {children}
    </span>
  )
}
