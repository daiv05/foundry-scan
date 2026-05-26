'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { mdiCheckBold, mdiArrowLeft, mdiArrowRight } from '@mdi/js'
import { api } from '@/lib/api'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import ScoreBar from '@/components/ScoreBar'
import ScoreBadge from '@/components/ScoreBadge'
import Icon from '@/components/ui/Icon'
import { Textarea } from '@/components/ui/Input'

const STATUS_ALL: OpportunityStatus[] = ['new', 'evaluating', 'building', 'discarded', 'archived']

const STATUS_STYLES: Record<OpportunityStatus, { bg: string; border: string; text: string }> = {
  new:        { bg: 'bg-rb-bg',    border: 'border-rb-fg',   text: 'text-rb-fg' },
  evaluating: { bg: 'bg-rb-warning', border: 'border-rb-fg',  text: 'text-black' },
  discarded:  { bg: 'bg-rb-error', border: 'border-rb-fg',  text: 'text-white' },
  building:   { bg: 'bg-rb-success', border: 'border-rb-fg',  text: 'text-white' },
  archived:   { bg: 'bg-rb-sunken', border: 'border-rb-fg',  text: 'text-rb-fg' },
}

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

  if (!opp) return <div className="p-sp-5 uppercase tracking-[1px]">Loading…</div>

  const evidence = Array.isArray(opp.evidence) ? opp.evidence : opp.evidence ? [opp.evidence] : []

  return (
    <div className="p-sp-5 max-w-[860px] mx-auto space-y-sp-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-[8px] text-[12px] uppercase tracking-[1px]">
        <Link href="/opportunities" className="underline hover:text-rb-link">Opportunities</Link>
        <span>/</span>
        <span className="truncate">{opp.name ?? id}</span>
      </div>

      {/* Header */}
      <div className="pb-sp-4 border-b-[3px] border-rb-fg">
        <div className="flex items-baseline gap-sp-3 flex-wrap mb-sp-2">
          {opp.rank != null && (
            <span
              className="text-[24px] font-bold text-rb-fg/60"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              #{opp.rank}
            </span>
          )}
          <h1 className="text-[48px] leading-none flex-1 min-w-0 break-words">{opp.name?.toUpperCase()}</h1>
          {opp.score != null && <ScoreBadge score={opp.score} size="md" />}
        </div>
        <p className="text-[16px] leading-relaxed mt-sp-2">{opp.problem}</p>
      </div>

      {/* Status buttons */}
      <div>
        <p
          className="text-[10px] uppercase tracking-[1px] mb-sp-2"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          YOUR STATUS
        </p>
        <div className="flex gap-[6px] flex-wrap">
          {STATUS_ALL.map(s => {
            const active = opp.user_status === s
            const styles = STATUS_STYLES[s]
            return (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={
                  `inline-flex items-center gap-[6px] border-[3px] px-sp-3 py-[8px] uppercase text-[12px] tracking-[2px] font-semibold cursor-pointer ` +
                  `${active ? `${styles.bg} ${styles.border} ${styles.text}` : 'bg-rb-bg border-rb-fg text-rb-fg hover:bg-rb-fg hover:text-rb-bg'}`
                }
              >
                {active && <Icon path={mdiCheckBold} size={12} />}
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Score breakdown */}
      {opp.scoring && opp.score != null && (
        <div className="border-[3px] border-rb-fg bg-rb-bg p-sp-4">
          <h3
            className="text-[20px] uppercase mb-sp-3 leading-none"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            SCORE BREAKDOWN
          </h3>
          <ScoreBar scoring={opp.scoring} totalScore={opp.score} />
        </div>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <div>
          <h3
            className="text-[20px] uppercase mb-sp-2 leading-none"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            EVIDENCE
          </h3>
          <div className="flex flex-wrap gap-[6px]">
            {evidence.map((e, i) => (
              <span
                key={i}
                className="inline-block bg-rb-bg border-[2px] border-rb-fg px-[10px] py-[4px] text-[12px]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {String(e)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sp-3">
        {[
          { label: 'TARGET USER',  value: opp.target_user },
          { label: 'BUILD TIME',   value: opp.build_time },
          { label: 'MONETIZATION', value: opp.monetization },
        ].map(({ label, value }) => value ? (
          <div key={label} className="border-[3px] border-rb-fg bg-rb-bg px-sp-3 py-sp-3">
            <p
              className="text-[10px] uppercase tracking-[1px] mb-[6px]"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {label}
            </p>
            <p className="text-[14px]">{value}</p>
          </div>
        ) : null)}
      </div>

      {/* MVP features */}
      {opp.mvp_features && opp.mvp_features.length > 0 && (
        <div className="border-[3px] border-rb-fg bg-rb-bg p-sp-3">
          <p
            className="text-[10px] uppercase tracking-[1px] mb-sp-2"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            MVP FEATURES
          </p>
          <ul className="space-y-[6px]">
            {opp.mvp_features.map((f, i) => (
              <li key={i} className="flex items-start gap-sp-2 text-[14px]">
                <Icon path={mdiCheckBold} size={16} className="text-rb-success mt-[2px] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      {opp.reasoning && (
        <div className="border-[3px] border-rb-fg bg-rb-bg p-sp-3">
          <p
            className="text-[10px] uppercase tracking-[1px] mb-sp-2"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            LLM REASONING
          </p>
          <p className="text-[14px] leading-relaxed">{opp.reasoning}</p>
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-sp-2">
          <p
            className="text-[10px] uppercase tracking-[1px]"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            PERSONAL NOTES
          </p>
          <span className="text-[11px] uppercase tracking-[1px] text-rb-fg/60">
            {saving ? 'SAVING…' : saved ? '✓ SAVED' : 'AUTO-SAVED'}
          </span>
        </div>
        <Textarea
          value={notes}
          onChange={e => handleNotes(e.target.value)}
          placeholder="Your thoughts, research links, decisions…"
          rows={5}
        />
      </div>

      <div className="flex items-center gap-sp-4 text-[12px] uppercase tracking-[1px] border-t-[3px] border-rb-fg pt-sp-3 flex-wrap">
        <Link href="/opportunities" className="inline-flex items-center gap-[6px] underline hover:text-rb-link">
          <Icon path={mdiArrowLeft} size={14} /> All opportunities
        </Link>
        <Link href={`/scan/${opp.scan}/report`} className="inline-flex items-center gap-[6px] underline hover:text-rb-link">
          View scan report <Icon path={mdiArrowRight} size={14} />
        </Link>
      </div>
    </div>
  )
}
