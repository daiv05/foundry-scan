import Link from 'next/link'
import { ssrGetScans, ssrGetOpportunities } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import OpportunityCard from '@/components/OpportunityCard'
import type { Scan } from '@/lib/types'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function PendingBanner({ scans }: { scans: Scan[] }) {
  const waiting = scans.filter(s => s.status === 'awaiting_llm_input')
  if (!waiting.length) return null
  return (
    <div className="rounded-xl border border-yellow-700 bg-yellow-950/40 px-5 py-4 flex items-start gap-4">
      <span className="text-xl">⚡</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-yellow-300">
          {waiting.length === 1 ? 'A scan' : `${waiting.length} scans`} ready for LLM input
        </p>
        <p className="text-sm text-yellow-400/80 mt-0.5">
          Copy the prompt, paste it into your LLM, then come back with the response.
        </p>
      </div>
      <Link
        href={`/scan/${waiting[0].id}/prompt`}
        className="shrink-0 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-4 py-2 transition-colors"
      >
        Open →
      </Link>
    </div>
  )
}

export default async function DashboardPage() {
  const [scans, topOpps] = await Promise.all([
    ssrGetScans().catch(() => []),
    ssrGetOpportunities({ perPage: 6, sort: '-score' }).catch(() => []),
  ])

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Your micro-SaaS opportunity pipeline</p>
        </div>
        <Link
          href="/scan/new"
          className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 text-sm transition-colors"
        >
          + New Scan
        </Link>
      </div>

      {scans.length > 0 && <PendingBanner scans={scans} />}

      {/* Recent scans */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
          Recent Scans
        </h2>
        {scans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
            <p className="text-gray-400 mb-4">No scans yet.</p>
            <Link
              href="/scan/new"
              className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2 text-sm transition-colors inline-block"
            >
              Launch your first scan →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {scans.map(scan => (
              <Link
                key={scan.id}
                href={
                  scan.status === 'completed'
                    ? `/scan/${scan.id}/report`
                    : scan.status === 'awaiting_llm_input'
                    ? `/scan/${scan.id}/prompt`
                    : `/scan/${scan.id}`
                }
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-5 py-3 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <StatusBadge status={scan.status} />
                  <span className="text-sm text-gray-300 truncate font-mono">{scan.id}</span>
                </div>
                <div className="flex items-center gap-6 shrink-0 text-xs text-gray-500">
                  {scan.llm_used && <span>{scan.llm_used}</span>}
                  <span>{fmtDate(scan.created)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top opportunities */}
      {topOpps.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Top Opportunities
            </h2>
            <Link href="/opportunities" className="text-xs text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topOpps.map(opp => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
        </section>
      )}

      {topOpps.length === 0 && scans.length > 0 && (
        <section>
          <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
            <p className="text-gray-400">No opportunities yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Complete a scan and submit the LLM response to see results here.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
