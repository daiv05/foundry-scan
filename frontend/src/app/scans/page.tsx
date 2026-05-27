'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { mdiPlus, mdiArchive, mdiArchiveOff, mdiDelete, mdiAlertOctagon, mdiRocketLaunchOutline } from '@mdi/js'
import { api } from '@/lib/api'
import type { Scan } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import Icon from '@/components/ui/Icon'

type Tab = 'active' | 'archived' | 'all'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function scanHref(scan: Scan): string {
  if (scan.status === 'completed') return `/scan/${scan.id}/report`
  if (scan.status === 'awaiting_llm_input') return `/scan/${scan.id}/prompt`
  return `/scan/${scan.id}`
}

// ── Single scan row ──────────────────────────────────────────────────────────

function ScanRow({
  scan,
  onArchiveToggle,
  onDelete,
}: {
  scan: Scan
  onArchiveToggle: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actioning, setActioning] = useState(false)

  async function handleArchive() {
    setActioning(true)
    try {
      await api.archiveScan(scan.id, !scan.archived)
      onArchiveToggle(scan.id, !scan.archived)
    } finally {
      setActioning(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setActioning(true)
    try {
      await api.deleteScan(scan.id)
      onDelete(scan.id)
    } finally {
      setActioning(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div
      className={`flex items-center gap-sp-3 px-sp-3 py-[12px] border-t-[3px] border-rb-fg first:border-t-0 ${scan.archived ? 'opacity-50' : ''}`}
    >
      {/* Clickable area */}
      <Link
        href={scanHref(scan)}
        className="flex items-center gap-sp-3 min-w-0 flex-1 hover:underline"
      >
        <StatusBadge status={scan.status} />
        <span
          className="text-[13px] truncate"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {scan.id}
        </span>
        {scan.archived && (
          <span className="shrink-0 text-[10px] uppercase tracking-[1px] border-[2px] border-rb-fg px-[6px] py-[2px] text-rb-fg/60">
            ARCHIVED
          </span>
        )}
      </Link>

      {/* Meta */}
      <div className="hidden sm:flex items-center gap-sp-3 shrink-0 text-[12px] uppercase tracking-[1px] text-rb-fg/60">
        {scan.llm_used && <span>{scan.llm_used}</span>}
        <span>{fmtDate(scan.created)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-[6px] shrink-0">
        {/* Archive / Unarchive */}
        <button
          onClick={handleArchive}
          disabled={actioning}
          title={scan.archived ? 'Unarchive scan' : 'Archive scan'}
          className="p-[6px] border-[2px] border-rb-fg text-rb-fg hover:bg-rb-fg hover:text-rb-bg disabled:opacity-40 cursor-pointer"
        >
          <Icon path={scan.archived ? mdiArchiveOff : mdiArchive} size={16} />
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-[4px]">
            <span className="text-[11px] uppercase tracking-[1px] text-rb-error font-bold">
              SURE?
            </span>
            <button
              onClick={handleDelete}
              disabled={actioning}
              className="px-[8px] py-[4px] bg-rb-error text-white text-[11px] uppercase tracking-[1px] font-bold border-[2px] border-rb-error hover:opacity-80 disabled:opacity-40 cursor-pointer"
            >
              YES
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-[8px] py-[4px] border-[2px] border-rb-fg text-rb-fg text-[11px] uppercase tracking-[1px] font-bold hover:bg-rb-fg hover:text-rb-bg cursor-pointer"
            >
              NO
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete scan"
            className="p-[6px] border-[2px] border-rb-fg text-rb-fg hover:bg-rb-error hover:text-white hover:border-rb-error disabled:opacity-40 cursor-pointer"
          >
            <Icon path={mdiDelete} size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('active')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch active and archived separately, merge for "all" tab
      const [active, archived] = await Promise.all([
        api.getScans({ archived: false, perPage: 200 }),
        api.getScans({ archived: true,  perPage: 200 }),
      ])
      setScans([...active, ...archived])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleArchiveToggle(id: string, archived: boolean) {
    setScans(prev => prev.map(s => s.id === id ? { ...s, archived } : s))
  }

  function handleDelete(id: string) {
    setScans(prev => prev.filter(s => s.id !== id))
  }

  const visible = scans.filter(s =>
    tab === 'all'     ? true :
    tab === 'active'  ? !s.archived :
    /* archived */      s.archived
  )

  const TABS: { id: Tab; label: string }[] = [
    { id: 'active',   label: `ACTIVE (${scans.filter(s => !s.archived).length})` },
    { id: 'archived', label: `ARCHIVED (${scans.filter(s => s.archived).length})` },
    { id: 'all',      label: `ALL (${scans.length})` },
  ]

  return (
    <div className="p-sp-5 max-w-[900px] mx-auto space-y-sp-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-sp-3 flex-wrap pb-sp-4 border-b-[3px] border-rb-fg">
        <div>
          <h1 className="text-[40px] md:text-[64px] leading-none">SCANS</h1>
          <p
            className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mt-[8px]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {visible.length} ITEM{visible.length !== 1 ? 'S' : ''}
          </p>
        </div>
        <Link
          href="/scan/new"
          className="inline-flex items-center gap-[8px] bg-rb-fg text-rb-bg border-[3px] border-rb-fg px-sp-3 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-bg hover:text-rb-fg"
        >
          <Icon path={mdiPlus} size={18} /> NEW SCAN
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-[0px]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              `px-sp-3 py-[10px] border-[3px] border-rb-fg text-[12px] uppercase tracking-[2px] font-semibold cursor-pointer -ml-[3px] first:ml-0 ` +
              `${tab === t.id ? 'bg-rb-fg text-rb-bg z-10 relative' : 'bg-rb-bg text-rb-fg hover:bg-rb-sunken'}`
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-[8px] border-[3px] border-rb-error text-rb-error px-sp-3 py-sp-2">
          <Icon path={mdiAlertOctagon} size={18} />
          <span className="text-[13px]">{error}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="uppercase tracking-[1px] text-[14px]">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="border-[3px] border-dashed border-rb-fg bg-rb-sunken p-sp-6 text-center">
          {tab === 'archived' ? (
            <p className="uppercase font-semibold text-rb-fg/60">No archived scans</p>
          ) : (
            <>
              <Icon path={mdiRocketLaunchOutline} size={48} className="text-rb-fg mb-sp-3" />
              <p className="text-[18px] mb-sp-3 uppercase font-semibold">No scans yet</p>
              <Link
                href="/scan/new"
                className="inline-flex items-center gap-[8px] bg-rb-fg text-rb-bg border-[3px] border-rb-fg px-sp-4 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-bg hover:text-rb-fg"
              >
                LAUNCH FIRST SCAN <Icon path={mdiRocketLaunchOutline} size={16} />
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="border-[3px] border-rb-fg bg-rb-bg">
          {visible.map(scan => (
            <ScanRow
              key={scan.id}
              scan={scan}
              onArchiveToggle={handleArchiveToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
