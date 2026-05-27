'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  mdiCheckBold, mdiFileDocumentOutline, mdiFileOutline,
  mdiTagOutline,
} from '@mdi/js'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { api } from '@/lib/api'
import { downloadOpportunity } from '@/lib/opportunityExport'
import { useLongPress } from '@/hooks/useLongPress'
import ScoreBadge from './ScoreBadge'
import { StatusChip } from './ui/Chip'
import ContextMenu, { type ContextMenuItem } from './ui/ContextMenu'
import Icon from './ui/Icon'

// ── Status config ────────────────────────────────────────────────────────────

type Kind = 'active' | 'warning' | 'error' | 'default' | 'info'

const STATUS_CONFIG: Record<OpportunityStatus, { label: string; kind: Kind }> = {
  new:        { label: 'New',        kind: 'default' },
  saved:      { label: 'Saved',      kind: 'info'    },
  evaluating: { label: 'Evaluating', kind: 'warning' },
  discarded:  { label: 'Discarded',  kind: 'error'   },
  building:   { label: 'Building',   kind: 'active'  },
  archived:   { label: 'Archived',   kind: 'default' },
}

const STATUS_ALL: OpportunityStatus[] = ['new', 'saved', 'evaluating', 'building', 'discarded', 'archived']

// ── Component ────────────────────────────────────────────────────────────────

interface MenuPos { x: number; y: number }

export default function OpportunityCard({
  opp: initialOpp,
  linkBase = '/opportunities',
  displayIndex,
  onStatusChange,
}: {
  opp: Opportunity
  linkBase?: string
  displayIndex?: number
  onStatusChange?: (id: string, status: OpportunityStatus) => void
}) {
  const [opp, setOpp] = useState(initialOpp)
  const [menu, setMenu] = useState<MenuPos | null>(null)

  const evidence = Array.isArray(opp.evidence)
    ? opp.evidence.join(', ')
    : opp.evidence ?? ''

  const status = STATUS_CONFIG[opp.user_status] ?? { label: opp.user_status, kind: 'default' as Kind }

  // ── Context menu actions ────────────────────────────────────────────────

  const openMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const x = 'touches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX
    const y = 'touches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY
    setMenu({ x, y })
  }, [])

  const handleStatusChange = useCallback(async (status: OpportunityStatus) => {
    const updated = await api.updateOpportunity(opp.id, { user_status: status })
    setOpp(updated)
    onStatusChange?.(opp.id, status)
  }, [opp.id, onStatusChange])

  // ── Long press (mobile) ─────────────────────────────────────────────────

  const { firedRef, ...longPressProps } = useLongPress({ delay: 500, onLongPress: openMenu })

  // ── Context menu items ──────────────────────────────────────────────────

  const menuItems: ContextMenuItem[] = [
    // Status options
    ...STATUS_ALL.map((s, i) => ({
      label:   s.charAt(0).toUpperCase() + s.slice(1),
      icon:    mdiTagOutline,
      active:  opp.user_status === s,
      divider: i === 0,
      onClick: () => handleStatusChange(s),
    })),
    // Downloads
    {
      label:   'Download .md',
      icon:    mdiFileDocumentOutline,
      divider: true,
      onClick: () => downloadOpportunity(opp, 'md'),
    },
    {
      label:   'Download .txt',
      icon:    mdiFileOutline,
      onClick: () => downloadOpportunity(opp, 'txt'),
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="relative"
        onContextMenu={openMenu}
        {...longPressProps}
      >
        <Link
          href={`${linkBase}/${opp.id}`}
          onClick={e => {
            // Suppress navigation if long-press just fired
            if (firedRef.current) { e.preventDefault(); firedRef.current = false }
          }}
          className="block bg-rb-bg border-[3px] border-rb-fg p-sp-4 hover:bg-rb-fg hover:text-rb-bg group select-none"
          draggable={false}
        >
          <div className="flex items-start justify-between gap-[12px] mb-[8px]">
            <div className="flex items-baseline gap-[8px] min-w-0">
              {displayIndex != null ? (
                <span
                  className="shrink-0 text-[14px] font-bold text-rb-fg/60 group-hover:text-rb-bg/60"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  #{displayIndex}
                </span>
              ) : opp.rank != null ? (
                <span
                  className="shrink-0 text-[14px] font-bold text-rb-fg/60 group-hover:text-rb-bg/60"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  #{opp.rank}
                </span>
              ) : null}
              <h4
                className="text-[18px] font-semibold leading-tight truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {opp.name ?? 'Unnamed'}
              </h4>
            </div>
            <div className="flex items-center gap-[8px] shrink-0">
              {opp.score != null && <ScoreBadge score={opp.score} />}
            </div>
          </div>

          <p className="text-[14px] line-clamp-2 mb-[8px] leading-relaxed">
            {opp.problem}
          </p>

          {evidence && (
            <p
              className="text-[12px] text-rb-fg/60 group-hover:text-rb-bg/60 truncate mb-[12px]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {evidence}
            </p>
          )}

          <div className="flex items-center justify-between gap-[12px] flex-wrap pt-[12px] border-t-[2px] border-rb-fg/20 group-hover:border-rb-bg/30">
            <StatusChip kind={status.kind}>{status.label}</StatusChip>
            <div className="flex gap-[16px] text-[11px] uppercase tracking-[1px] text-rb-fg/60 group-hover:text-rb-bg/60">
              {opp.build_time && <span>BUILD: {opp.build_time}</span>}
              {opp.monetization && <span className="truncate max-w-[180px]">{opp.monetization}</span>}
            </div>
          </div>

          {/* Context menu hint - visible on hover, desktop only */}
          <div className="hidden md:flex absolute bottom-[10px] right-[12px] opacity-0 group-hover:opacity-40 items-center gap-[4px] text-[10px] uppercase tracking-[1px] pointer-events-none">
            <Icon path={mdiCheckBold} size={10} />
            right-click
          </div>
        </Link>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  )
}
