/**
 * RawBlock Button — square, 3px border, uppercase tracking, theme-aware.
 * Variants: primary | secondary | ghost | destructive
 * Sizes: sm | md | lg
 *
 * `primary` and `secondary` use semantic tokens (auto-invert in dark mode).
 * `destructive` keeps literal #FF0000 fill (status color, theme-independent).
 */

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-rb-fg text-rb-bg border-[3px] border-rb-fg ' +
    'hover:bg-rb-bg hover:text-rb-fg ' +
    'active:bg-rb-fg active:text-rb-bg active:[outline:2px_solid_var(--color-rb-fg)] active:[outline-offset:0] ' +
    'disabled:bg-rb-disabled-bg disabled:text-rb-fg/40 disabled:border-rb-disabled-border disabled:cursor-not-allowed disabled:hover:bg-rb-disabled-bg disabled:hover:text-rb-fg/40',
  secondary:
    'bg-rb-bg text-rb-fg border-[3px] border-rb-fg ' +
    'hover:bg-rb-fg hover:text-rb-bg ' +
    'disabled:bg-rb-disabled-bg disabled:text-rb-fg/40 disabled:border-rb-disabled-border disabled:cursor-not-allowed disabled:hover:bg-rb-disabled-bg disabled:hover:text-rb-fg/40',
  ghost:
    'bg-transparent text-rb-fg border-0 underline underline-offset-2 ' +
    'hover:text-rb-link ' +
    'disabled:text-rb-fg/40 disabled:cursor-not-allowed disabled:hover:text-rb-fg/40',
  destructive:
    'bg-rb-error text-white border-[3px] border-rb-fg ' +
    'hover:bg-rb-fg hover:text-rb-error ' +
    'disabled:bg-rb-disabled-bg disabled:text-rb-fg/40 disabled:border-rb-disabled-border disabled:cursor-not-allowed',
}

const SIZES: Record<Size, string> = {
  sm: 'px-[16px] py-[6px] text-[12px] min-h-[32px]',
  md: 'px-[24px] py-[10px] text-[14px] min-h-[44px]',
  lg: 'px-[40px] py-[16px] text-[18px] min-h-[56px]',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...rest },
  ref,
) {
  const isGhost = variant === 'ghost'
  return (
    <button
      ref={ref}
      className={
        `inline-flex items-center justify-center gap-2 ` +
        `${isGhost ? '' : 'uppercase tracking-[2px] font-semibold'} ` +
        `transition-none cursor-pointer ` +
        `${VARIANTS[variant]} ${SIZES[size]} ${className}`
      }
      {...rest}
    >
      {children}
    </button>
  )
})

export default Button
