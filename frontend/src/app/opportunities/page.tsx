'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'

const STATUS_OPTIONS: { value: OpportunityStatus | ''; label: string }[] = [
  { value: '',           label: 'All statuses' },
  { value: 'new',        label: 'New' },
  { value: 'evaluating', label: 'Evaluating' },
  { value: 'building',   label: 'Building' },
  { value: 'discarded',  label: 'Discarded' },
  { value: 'archived',   label: 'Archived' },
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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-sm text-gray-400 mt-1">
            {filtered.length} opportunit{filtered.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <Link href="/scan/new" className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 transition-colors">
          + New Scan
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as OpportunityStatus | '')}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="-score">Sort: highest score</option>
          <option value="score">Sort: lowest score</option>
          <option value="rank">Sort: rank</option>
          <option value="-created">Sort: newest</option>
        </select>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Min score:</label>
          <input
            type="number"
            min={0} max={10} step={0.5}
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="w-16 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-gray-400 animate-pulse text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
          <p className="text-gray-400 mb-2">No opportunities found.</p>
          <Link href="/scan/new" className="text-blue-400 hover:text-blue-300 text-sm">
            Launch a scan to discover opportunities →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(opp => <OpportunityCard key={opp.id} opp={opp} />)}
        </div>
      )}
    </div>
  )
}
