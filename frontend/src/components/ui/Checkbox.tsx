/**
 * RawBlock Checkbox - 20×20, square, 3px border, theme-aware.
 * Checked = inverse fill (rb-fg on light, rb-bg on dark).
 */

import { mdiCheckBold } from '@mdi/js'
import Icon from './Icon'
import type { InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export default function Checkbox({ label, checked, className = '', ...rest }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-[10px] cursor-pointer select-none ${className}`}>
      <span className="relative inline-block w-[20px] h-[20px] shrink-0">
        <input
          type="checkbox"
          checked={checked}
          className="peer absolute inset-0 opacity-0 cursor-pointer"
          {...rest}
        />
        <span
          className={
            `block w-[20px] h-[20px] border-[3px] border-rb-fg ` +
            `peer-focus-visible:[outline:2px_solid_var(--color-rb-fg)] peer-focus-visible:[outline-offset:0] ` +
            `peer-disabled:border-rb-disabled-border peer-disabled:bg-rb-disabled-bg ` +
            `${checked ? 'bg-rb-fg' : 'bg-rb-bg'}`
          }
        />
        {checked && (
          <Icon path={mdiCheckBold} size={14} className="absolute top-[3px] left-[3px] text-rb-bg pointer-events-none" />
        )}
      </span>
      {label && <span className="text-[14px] text-rb-fg">{label}</span>}
    </label>
  )
}
