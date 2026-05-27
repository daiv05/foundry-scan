'use client'

import { useState, useCallback } from 'react'
import { mdiMenu } from '@mdi/js'
import Sidebar from './Sidebar'
import Icon from './ui/Icon'

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    // h-screen + overflow-hidden: viewport is the scroll root; only <main> scrolls
    <div className="flex h-screen overflow-hidden">

      {/* ── Mobile backdrop ─────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      {/*
        Mobile: fixed overlay, hidden by default (-translate-x-full),
                slides in when open.
        Desktop: regular flex child, always visible (translate-x-0).
      */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50',
          'transition-transform duration-150',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:relative md:inset-auto md:translate-x-0 md:z-auto',
          'flex flex-col shrink-0',
        ].join(' ')}
      >
        <Sidebar onClose={close} />
      </div>

      {/* ── Content column ──────────────────────────────────────────── */}
      {/*
        flex-col + flex-1: fills remaining horizontal space.
        The mobile topbar is fixed-height; <main> takes the rest and scrolls.
      */}
      <div className="flex flex-col flex-1 min-w-0 h-screen">

        {/* Mobile top-bar */}
        <header className="md:hidden flex items-center justify-between px-sp-3 py-[14px] border-b-[3px] border-rb-fg bg-rb-bg shrink-0 z-30">
          <p className="leading-none" style={{ fontFamily: 'var(--font-headline)' }}>
            <span className="text-[18px] tracking-[1px]">FOUNDRY</span>
            <span className="text-[15px] text-rb-fg/70 tracking-[3px] ml-[6px]">SCAN</span>
          </p>
          <button
            onClick={() => setOpen(true)}
            className="p-[8px] border-[3px] border-rb-fg hover:bg-rb-fg hover:text-rb-bg cursor-pointer"
            aria-label="Open navigation"
          >
            <Icon path={mdiMenu} size={20} />
          </button>
        </header>

        {/* Scrollable page area */}
        <main className="flex-1 overflow-y-auto bg-rb-bg min-w-0">
          {children}
        </main>

      </div>
    </div>
  )
}
