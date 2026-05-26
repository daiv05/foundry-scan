'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import ScoreBar from '@/components/ScoreBar'
import ScoreBadge from '@/components/ScoreBadge'

const STATUS_FLOW: OpportunityStatus[] = ['new', 'evaluating', 'building', 'archived']
const STATUS_COLORS: Record<OpportunityStatus, string> = {
  new:        'border-gray-700 text-gray-400',
  evaluating: 'border-yellow-700 bg-yellow-950/30 text-yellow-300',
  discarded:  'border-red-800 bg-red-950/30 text-red-400',
  building:   'border-green-700 bg-green-950/30 text-green-300',
  archived:   'border-gray-700 text-gray-500',
}

const STATUS_ALL: OpportunityStatus[] = ['new', 'evaluating', 'building', 'discarded', 'archived']

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [opp, setOpp] = useState<Opportunity | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.getOpportunity(id).then(o => {
      setOpp(o)
      setNotes(o.notes ?? '')
    })
  }, [id])

  const updateStatus = useCallback(async (status: OpportunityStatus) => {
    if (!opp) return
    const updated = await api.updateOpportunity(id, { user_status: status })
    setOpp(updated)
  }, [id, opp])

  const handleNotes = useCallback((value: string) => {
    setNotes(value)
    setSaved(false)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      setSaving(true)
      await api.updateOpportunity(id, { notes: value })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }, [id])

  if (!opp) return <div className="p-8 text-gray-400 animate-pulse text-sm">Loading…</div>

  const evidence = Array.isArray(opp.evidence) ? opp.evidence : opp.evidence ? [opp.evidence] : []

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/opportunities" className="hover:text-gray-300">Opportunities</Link>
        <span>/</span>
        <span className="text-gray-300 truncate">{opp.name ?? id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 justify-between flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {opp.rank != null && (
              <span className="text-sm font-mono text-gray-500">#{opp.rank}</span>
            )}
            <h1 className="text-2xl font-bold text-white">{opp.name}</h1>
            {opp.score != null && <ScoreBadge score={opp.score} />}
          </div>
          <p className="text-gray-400 mt-2">{opp.problem}</p>
        </div>
      </div>

      {/* Status buttons */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your status</p>
        <div className="flex gap-2 flex-wrap">
          {STATUS_ALL.map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors capitalize ${
                opp.user_status === s
                  ? STATUS_COLORS[s]
                  : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Score breakdown */}
      {opp.scoring && opp.score != null && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Score Breakdown</h2>
          <ScoreBar scoring={opp.scoring} totalScore={opp.score} />
        </div>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Evidence</h2>
          <div className="flex flex-wrap gap-2">
            {evidence.map((e, i) => (
              <span key={i} className="rounded-full border border-blue-800 bg-blue-950/40 text-blue-300 text-xs px-3 py-1">
                {String(e)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Target user',   value: opp.target_user },
          { label: 'Build time',    value: opp.build_time },
          { label: 'Monetization',  value: opp.monetization },
        ].map(({ label, value }) => value ? (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm text-gray-200">{value}</p>
          </div>
        ) : null)}
      </div>

      {/* MVP features */}
      {opp.mvp_features && opp.mvp_features.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">MVP Features</p>
          <ul className="space-y-1">
            {opp.mvp_features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      {opp.reasoning && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">LLM Reasoning</p>
          <p className="text-sm text-gray-300 leading-relaxed">{opp.reasoning}</p>
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Personal notes</p>
          <span className="text-xs text-gray-600">
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Auto-saved'}
          </span>
        </div>
        <textarea
          value={notes}
          onChange={e => handleNotes(e.target.value)}
          placeholder="Your thoughts, research links, decisions…"
          rows={5}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-y transition-colors"
        />
      </div>

      <div className="flex items-center gap-4 text-sm border-t border-gray-800 pt-4">
        <Link href="/opportunities" className="text-gray-500 hover:text-gray-300">
          ← All opportunities
        </Link>
        <Link href={`/scan/${opp.scan}/report`} className="text-gray-500 hover:text-blue-400">
          View scan report →
        </Link>
      </div>
    </div>
  )
}
