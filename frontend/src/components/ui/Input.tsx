/**
 * RawBlock Input — square, theme-aware sunken fill, 3px border.
 * Focus uses an outline (painted outside) so layout never shifts.
 */

import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

// Shared focus outline — sits outside the border, doesn't affect layout.
// `currentColor` follows text color, so it auto-inverts with the theme.
const FOCUS_OUTLINE       = 'focus:[outline:2px_solid_currentColor] focus:[outline-offset:0]'
const FOCUS_OUTLINE_ERROR = 'focus:[outline:2px_solid_var(--color-rb-error)] focus:[outline-offset:0]'

// ── Label ─────────────────────────────────────────────────────────────────

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block uppercase text-[14px] text-rb-fg mb-[4px]"
      style={{ fontFamily: 'var(--font-headline)' }}
    >
      {children}
    </label>
  )
}

// ── Helper text ──────────────────────────────────────────────────────────

export function HelperText({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className={`text-[12px] mt-[4px] ${error ? 'text-rb-error' : 'text-rb-fg/60'}`}>
      {children}
    </p>
  )
}

// ── Input ────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, className = '', id, ...rest },
  ref,
) {
  const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const borderColor  = error ? 'border-rb-error' : 'border-rb-fg'
  const focusOutline = error ? FOCUS_OUTLINE_ERROR : FOCUS_OUTLINE
  return (
    <div>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <input
        ref={ref}
        id={inputId}
        className={
          `w-full bg-rb-sunken text-rb-fg border-[3px] ${borderColor} ` +
          `px-[12px] py-[10px] text-[15px] outline-none ` +
          `hover:bg-rb-sunken-hover ` +
          `focus:bg-rb-sunken-hover ${focusOutline} ` +
          `disabled:bg-rb-disabled-bg disabled:border-rb-disabled-border disabled:cursor-not-allowed ` +
          `placeholder:text-rb-fg/40 ${className}`
        }
        style={{ fontFamily: 'var(--font-mono)' }}
        {...rest}
      />
      {(helper || error) && <HelperText error={!!error}>{error ?? helper}</HelperText>}
    </div>
  )
})

export default Input

// ── Textarea ─────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helper?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, className = '', id, ...rest },
  ref,
) {
  const inputId = id ?? (label ? `ta-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const borderColor  = error ? 'border-rb-error' : 'border-rb-fg'
  const focusOutline = error ? FOCUS_OUTLINE_ERROR : FOCUS_OUTLINE
  return (
    <div>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <textarea
        ref={ref}
        id={inputId}
        className={
          `w-full bg-rb-sunken text-rb-fg border-[3px] ${borderColor} ` +
          `px-[12px] py-[10px] text-[15px] outline-none resize-y ` +
          `hover:bg-rb-sunken-hover ` +
          `focus:bg-rb-sunken-hover ${focusOutline} ` +
          `disabled:bg-rb-disabled-bg disabled:border-rb-disabled-border disabled:cursor-not-allowed ` +
          `placeholder:text-rb-fg/40 ${className}`
        }
        style={{ fontFamily: 'var(--font-mono)' }}
        {...rest}
      />
      {(helper || error) && <HelperText error={!!error}>{error ?? helper}</HelperText>}
    </div>
  )
})

// ── Select ───────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helper?: string
  error?: string
  children: React.ReactNode
}

export function Select({ label, helper, error, className = '', id, children, ...rest }: SelectProps) {
  const inputId = id ?? (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const borderColor = error ? 'border-rb-error' : 'border-rb-fg'
  return (
    <div>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <select
        id={inputId}
        className={
          `bg-rb-sunken text-rb-fg border-[3px] ${borderColor} ` +
          `px-[12px] py-[10px] text-[15px] outline-none ` +
          `hover:bg-rb-sunken-hover ` +
          `${FOCUS_OUTLINE} ` +
          `disabled:bg-rb-disabled-bg disabled:border-rb-disabled-border ${className}`
        }
        style={{ fontFamily: 'var(--font-mono)' }}
        {...rest}
      >
        {children}
      </select>
      {(helper || error) && <HelperText error={!!error}>{error ?? helper}</HelperText>}
    </div>
  )
}
