'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { mdiPlus, mdiArrowRight } from '@mdi/js'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import OpportunityCard from '@/components/OpportunityCard'
import Icon from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Select } from '@/components/ui/Input'

const PER_PAGE = 20

type StatusFilter = OpportunityStatus | 'all'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',         label: 'ALL' },
  { value: 'new',         label: 'NEW' },
  { value: 'saved',       label: 'SAVED' },
  { value: 'evaluating',  label: 'EVALUATING' },
  { value: 'building',    label: 'BUILDING' },
  { value: 'discarded',   label: 'DISCARDED' },
  { value: 'archived',    label: 'ARCHIVED' },
]

// ── Inner component (needs useSearchParams inside Suspense) ──────────────────

function OpportunitiesContent() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const pathname      = usePathname()

  // Read filters from URL; default status=new
  const statusFilter = (searchParams.get('status') ?? 'new') as StatusFilter
  const sort         = searchParams.get('sort')  ?? '-score'
  const minScore     = Number(searchParams.get('min') ?? '0')

  const [items, setItems]             = useState<Opportunity[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore]         = useState(true)
  const [loading, setLoading]         = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── URL param helpers ──────────────────────────────────────────────────────

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '0') params.delete(key)
    else params.set(key, value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      if (replace) setLoading(true)
      else setLoadingMore(true)

      try {
        const data = await api.getOpportunities({
          userStatus: statusFilter === 'all' ? undefined : statusFilter || undefined,
          sort,
          minScore: minScore > 0 ? minScore : undefined,
          perPage: PER_PAGE,
          page,
        })
        setItems(prev => replace ? data : [...prev, ...data])
        setHasMore(data.length === PER_PAGE)
        setCurrentPage(page)
      } catch {
        // silently keep existing items on error
      } finally {
        if (replace) setLoading(false)
        else setLoadingMore(false)
      }
    },
    [statusFilter, sort, minScore],
  )

  // ── Reset on filter change ─────────────────────────────────────────────────

  useEffect(() => {
    setItems([])
    setHasMore(true)
    fetchPage(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sort, minScore])

  // ── Infinite scroll sentinel ───────────────────────────────────────────────

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPage(currentPage + 1, false)
        }
      },
      { rootMargin: '120px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, currentPage, fetchPage])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-sp-5 max-w-[1100px] mx-auto space-y-sp-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-sp-3 flex-wrap pb-sp-4 border-b-[3px] border-rb-fg">
        <div>
          <h1 className="text-[40px] md:text-[64px] leading-none">OPPORTUNITIES</h1>
          <p
            className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mt-[8px]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {loading ? 'LOADING…' : `${items.length}${hasMore ? '+' : ''} ITEM${items.length !== 1 ? 'S' : ''}`}
          </p>
        </div>
        <Link
          href="/scan/new"
          className="inline-flex items-center gap-[8px] bg-rb-fg text-rb-bg border-[3px] border-rb-fg px-sp-3 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-bg hover:text-rb-fg"
        >
          <Icon path={mdiPlus} size={18} /> NEW SCAN
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-sp-3">
        {/* Status chips */}
        <div className="flex gap-[6px] flex-wrap">
          {STATUS_OPTIONS.map(o => (
            <Chip
              key={o.value}
              active={statusFilter === o.value}
              onClick={() => setParam('status', o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>

        {/* Sort + min score */}
        <div className="flex gap-sp-3 flex-wrap items-end">
          <Select
            label="SORT BY"
            value={sort}
            onChange={e => setParam('sort', e.target.value)}
          >
            <option value="-score">Highest score</option>
            <option value="score">Lowest score</option>
            <option value="-created">Newest</option>
          </Select>

          <div>
            <label
              className="block uppercase text-[14px] text-rb-fg mb-[4px]"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              MIN SCORE
            </label>
            <input
              type="number"
              min={0} max={10} step={0.5}
              value={minScore}
              onChange={e => setParam('min', e.target.value)}
              className="w-[80px] bg-rb-sunken border-[3px] border-rb-fg px-[12px] py-[10px] text-[15px] outline-none focus:[outline:2px_solid_currentColor] focus:[outline-offset:0]"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="uppercase tracking-[1px] text-[14px]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="border-[3px] border-dashed border-rb-fg bg-rb-sunken p-sp-6 text-center">
          <p className="uppercase font-semibold mb-sp-2">No opportunities found</p>
          <Link
            href="/scan/new"
            className="inline-flex items-center gap-[8px] text-rb-link underline text-[14px] uppercase tracking-[1px]"
          >
            Launch a scan to discover opportunities <Icon path={mdiArrowRight} size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sp-3">
            {items.map((opp, idx) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                displayIndex={idx + 1}
                onStatusChange={(id, newStatus) => {
                  // If a specific status filter is active and the new status doesn't match, remove the card
                  if (statusFilter !== 'all' && statusFilter && newStatus !== statusFilter) {
                    setItems(prev => prev.filter(o => o.id !== id))
                  }
                }}
              />
            ))}
          </div>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-[1px]" />

          {loadingMore && (
            <div className="text-center uppercase tracking-[1px] text-[12px] text-rb-fg/60 py-sp-3">
              LOADING MORE…
            </div>
          )}
          {!hasMore && items.length > 0 && (
            <div className="text-center uppercase tracking-[1px] text-[12px] text-rb-fg/40 py-sp-3 border-t-[3px] border-rb-fg/20">
              END OF RESULTS - {items.length} TOTAL
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Page wrapper (required for useSearchParams in Next.js App Router) ────────

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={
      <div className="p-sp-5 uppercase tracking-[1px] text-[14px]">Loading…</div>
    }>
      <OpportunitiesContent />
    </Suspense>
  )
}
