'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

export interface ContextMenuItem {
  label: string
  icon?: string
  onClick: () => void
  active?: boolean
  danger?: boolean
  divider?: boolean  // renders a divider ABOVE this item
}

interface Props {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [onClose])

  // Constrain to viewport after mount
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (x + width  > vw) el.style.left = `${vw - width  - 8}px`
    if (y + height > vh) el.style.top  = `${vh - height - 8}px`
  }, [x, y])

  const menu = (
    <>
      {/* Invisible backdrop to catch outside clicks on mobile */}
      <div className="fixed inset-0 z-[998]" onMouseDown={onClose} onTouchStart={onClose} />

      <div
        ref={ref}
        className="fixed z-[999] bg-rb-bg border-[3px] border-rb-fg min-w-[200px] shadow-none"
        style={{ left: x, top: y }}
      >
        {items.map((item, i) => (
          <div key={i}>
            {item.divider && i > 0 && (
              <div className="border-t-[2px] border-rb-fg/20 mx-sp-2" />
            )}
            <button
              onClick={() => { item.onClick(); onClose() }}
              className={
                `w-full flex items-center gap-[10px] px-[14px] py-[10px] ` +
                `text-[12px] uppercase tracking-[1px] font-semibold text-left cursor-pointer ` +
                `${item.active
                  ? 'bg-rb-fg text-rb-bg'
                  : item.danger
                    ? 'text-rb-error hover:bg-rb-error hover:text-white'
                    : 'text-rb-fg hover:bg-rb-fg hover:text-rb-bg'
                }`
              }
            >
              {item.icon && <Icon path={item.icon} size={14} className="shrink-0" />}
              {item.label}
            </button>
          </div>
        ))}
      </div>
    </>
  )

  return createPortal(menu, document.body)
}
