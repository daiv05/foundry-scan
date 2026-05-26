'use client'

import { useEffect, useState } from 'react'
import { mdiPlus, mdiArrowRight } from '@mdi/js'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import OpportunityCard from '@/components/OpportunityCard'
import Icon from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Select } from '@/components/ui/Input'

const STATUS_OPTIONS: { value: OpportunityStatus | ''; label: string }[] = [
  { value: '',           label: 'ALL' },
  { value: 'new',        label: 'NEW' },
  { value: 'evaluating', label: 'EVALUATING' },
  { value: 'building',   label: 'BUILDING' },
  { value: 'discarded',  label: 'DISCARDED' },
  { value: 'archived',   label: 'ARCHIVED' },
]

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | ''>('')
  const [minScore, setMinScore] = useState(0)
  const [sort, setSort] = useState('-score')

  useEffect(() => {
    setLoading(true)
    api
      .getOpportunities({ userStatus: statusFilter || undefined, sort, perPage: 100 })
      .then(data => { setOpps(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [statusFilter, sort])

  const filtered = opps.filter(o => (o.score ?? 0) >= minScore)

  return (
    <div className="p-sp-5 max-w-[1100px] mx-auto space-y-sp-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-sp-3 flex-wrap pb-sp-4 border-b-[3px] border-rb-fg">
        <div>
          <h1 className="text-[64px] leading-none">OPPORTUNITIES</h1>
          <p
            className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mt-[8px]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {filtered.length} ITEM{filtered.length !== 1 ? 'S' : ''}
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
              onClick={() => setStatusFilter(o.value)}
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
            onChange={e => setSort(e.target.value)}
          >
            <option value="-score">Highest score</option>
            <option value="score">Lowest score</option>
            <option value="rank">Rank</option>
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
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-[80px] bg-rb-sunken border-[3px] border-rb-fg px-[12px] py-[10px] text-[15px] outline-none focus:[outline:2px_solid_currentColor] focus:[outline-offset:0]"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="uppercase tracking-[1px]">Loading…</div>
      ) : filtered.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sp-3">
          {filtered.map(opp => <OpportunityCard key={opp.id} opp={opp} />)}
        </div>
      )}
    </div>
  )
}
