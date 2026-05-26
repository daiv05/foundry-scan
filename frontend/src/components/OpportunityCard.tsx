import Link from 'next/link'
import type { Opportunity } from '@/lib/types'
import ScoreBadge from './ScoreBadge'

const STATUS_LABEL: Record<string, string> = {
  new:        'New',
  evaluating: 'Evaluating',
  discarded:  'Discarded',
  building:   'Building',
  archived:   'Archived',
}

const STATUS_COLOR: Record<string, string> = {
  new:        'text-gray-400',
  evaluating: 'text-yellow-400',
  discarded:  'text-red-400',
  building:   'text-green-400',
  archived:   'text-gray-500',
}

export default function OpportunityCard({ opp, linkBase = '/opportunities' }: {
  opp: Opportunity
  linkBase?: string
}) {
  const evidence = Array.isArray(opp.evidence)
    ? opp.evidence.join(', ')
    : opp.evidence ?? ''

  return (
    <Link
      href={`${linkBase}/${opp.id}`}
      className="block rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {opp.rank != null && (
            <span className="shrink-0 text-xs font-mono text-gray-500">#{opp.rank}</span>
          )}
          <h3 className="font-semibold text-white truncate">{opp.name ?? 'Unnamed'}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {opp.score != null && <ScoreBadge score={opp.score} />}
          <span className={`text-xs ${STATUS_COLOR[opp.user_status] ?? 'text-gray-400'}`}>
            {STATUS_LABEL[opp.user_status] ?? opp.user_status}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{opp.problem}</p>
      {evidence && (
        <p className="text-xs text-gray-500 truncate">{evidence}</p>
      )}
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        {opp.build_time && <span>Build: {opp.build_time}</span>}
        {opp.monetization && <span className="truncate">{opp.monetization}</span>}
      </div>
    </Link>
  )
}
