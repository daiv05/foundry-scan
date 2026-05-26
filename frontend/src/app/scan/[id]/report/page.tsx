import Link from 'next/link'
import { ssrGetScan, ssrGetOpportunities } from '@/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import StatusBadge from '@/components/StatusBadge'

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [scan, opps] = await Promise.all([
    ssrGetScan(id).catch(() => null),
    ssrGetOpportunities({ scanId: id, sort: 'rank' }).catch(() => []),
  ])

  if (!scan) {
    return (
      <div className="p-8">
        <p className="text-red-400">Scan not found.</p>
        <Link href="/" className="text-blue-400 text-sm mt-2 block">← Back</Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-300">Dashboard</Link>
        <span>/</span>
        <span className="font-mono text-gray-300">{id}</span>
        <span>/</span>
        <span className="text-gray-300">Report</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Scan Report</h1>
            <StatusBadge status={scan.status} />
          </div>
          <p className="text-sm text-gray-400 font-mono">{id}</p>
        </div>
        {/* Export buttons */}
        <div className="flex gap-2">
          <a
            href={`/api/scans/${id}/export/markdown`}
            download
            className="rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-medium px-4 py-2 transition-colors"
          >
            ↓ Export .md
          </a>
          <a
            href={`/api/scans/${id}/export/prompt.txt`}
            download
            className="rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-medium px-4 py-2 transition-colors"
          >
            ↓ Prompt .txt
          </a>
        </div>
      </div>

      {/* Scan metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Opportunities', value: String(opps.length) },
          { label: 'LLM used',      value: scan.llm_used || '—' },
          { label: 'Completed',     value: fmtDate(scan.completed_at) },
          { label: 'Tokens est.',   value: scan.prompt_tokens_est ? `~${scan.prompt_tokens_est.toLocaleString()}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-semibold text-white truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Opportunities */}
      {opps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
          <p className="text-gray-400 mb-2">No opportunities parsed yet.</p>
          {scan.status === 'awaiting_llm_input' && (
            <Link
              href={`/scan/${id}/prompt`}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Go to prompt →
            </Link>
          )}
        </div>
      ) : (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Opportunities — ranked by score
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opps.map(opp => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
        </section>
      )}

      {/* Links to raw data */}
      <div className="flex gap-4 text-sm text-gray-500 border-t border-gray-800 pt-4">
        <Link href={`/scan/${id}/prompt`} className="hover:text-blue-400">View prompt</Link>
        {scan.llm_response_raw && (
          <a href={`/api/scans/${id}/response/raw`} target="_blank" rel="noopener" className="hover:text-blue-400">
            View raw response
          </a>
        )}
        <Link href={`/scan/${id}/response`} className="hover:text-blue-400">
          {scan.status === 'completed' ? 'Re-paste response' : 'Paste response'}
        </Link>
      </div>
    </div>
  )
}
