/**
 * RawBlock Card - square, thick border, theme-aware.
 * variant: 'default' (3px) | 'elevated' (5px)
 */

import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated'
  children: ReactNode
  noPadding?: boolean
}

export default function Card({ variant = 'default', children, className = '', noPadding, ...rest }: CardProps) {
  const border = variant === 'elevated' ? 'border-[5px]' : 'border-[3px]'
  const padding = noPadding ? '' : 'p-sp-4'
  return (
    <div
      className={`bg-rb-bg border-rb-fg ${border} ${padding} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
