import Link from 'next/link'
import type { Opportunity } from '@/lib/types'
import ScoreBadge from './ScoreBadge'
import { StatusChip } from './ui/Chip'

type Kind = 'active' | 'warning' | 'error' | 'default'

const STATUS_CONFIG: Record<string, { label: string; kind: Kind }> = {
  new:        { label: 'New',        kind: 'default' },
  evaluating: { label: 'Evaluating', kind: 'warning' },
  discarded:  { label: 'Discarded',  kind: 'error' },
  building:   { label: 'Building',   kind: 'active' },
  archived:   { label: 'Archived',   kind: 'default' },
}

export default function OpportunityCard({ opp, linkBase = '/opportunities' }: {
  opp: Opportunity
  linkBase?: string
}) {
  const evidence = Array.isArray(opp.evidence)
    ? opp.evidence.join(', ')
    : opp.evidence ?? ''

  const status = STATUS_CONFIG[opp.user_status] ?? { label: opp.user_status, kind: 'default' as const }

  return (
    <Link
      href={`${linkBase}/${opp.id}`}
      className="block bg-rb-bg border-[3px] border-rb-fg p-sp-4 hover:bg-rb-fg hover:text-rb-bg group"
    >
      <div className="flex items-start justify-between gap-[12px] mb-[8px]">
        <div className="flex items-baseline gap-[8px] min-w-0">
          {opp.rank != null && (
            <span
              className="shrink-0 text-[14px] font-bold text-rb-fg/60 group-hover:text-rb-bg/60"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              #{opp.rank}
            </span>
          )}
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
    </Link>
  )
}
