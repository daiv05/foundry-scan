import Link from 'next/link'
import { mdiDownload, mdiFileDocumentOutline } from '@mdi/js'
import { ssrGetScan, ssrGetOpportunities } from '@/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import StatusBadge from '@/components/StatusBadge'
import Icon from '@/components/ui/Icon'

function fmtDate(iso?: string) {
  if (!iso) return '-'
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
      <div className="p-sp-5">
        <p className="text-rb-error uppercase">Scan not found.</p>
        <Link href="/" className="text-rb-link underline text-[14px] mt-sp-2 block">← Back</Link>
      </div>
    )
  }

  return (
    <div className="p-sp-5 max-w-[1100px] mx-auto space-y-sp-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-[8px] text-[12px] uppercase tracking-[1px]">
        <Link href="/" className="underline hover:text-rb-link">Dashboard</Link>
        <span>/</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{id}</span>
        <span>/</span>
        <span>Report</span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between gap-sp-3 flex-wrap pb-sp-4 border-b-[3px] border-rb-fg">
        <div>
          <div className="flex items-center gap-sp-3 flex-wrap">
            <h1 className="text-[30px] md:text-[48px] leading-none">SCAN REPORT</h1>
            <StatusBadge status={scan.status} />
          </div>
          <p
            className="text-[14px] mt-[8px]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {id}
          </p>
        </div>
        {/* Export buttons */}
        <div className="flex gap-sp-2">
          <a
            href={`/api/scans/${id}/export/markdown`}
            download
            className="inline-flex items-center gap-[8px] bg-rb-bg text-rb-fg border-[3px] border-rb-fg px-sp-3 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-fg hover:text-rb-bg"
          >
            <Icon path={mdiDownload} size={16} /> .MD
          </a>
          <a
            href={`/api/scans/${id}/export/prompt.txt`}
            download
            className="inline-flex items-center gap-[8px] bg-rb-bg text-rb-fg border-[3px] border-rb-fg px-sp-3 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-fg hover:text-rb-bg"
          >
            <Icon path={mdiDownload} size={16} /> PROMPT
          </a>
        </div>
      </div>

      {/* Scan metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-[3px] border-rb-fg">
        {[
          { label: 'OPPORTUNITIES', value: String(opps.length) },
          { label: 'LLM USED',      value: scan.llm_used || '-' },
          { label: 'COMPLETED',     value: fmtDate(scan.completed_at) },
          { label: 'TOKENS EST.',   value: scan.prompt_tokens_est ? `~${scan.prompt_tokens_est.toLocaleString()}` : '-' },
        ].map(({ label, value }, i) => (
          <div
            key={label}
            className={`px-sp-3 py-sp-3 bg-rb-bg ${i < 3 ? 'md:border-r-[3px] md:border-rb-fg' : ''} ${i < 2 ? 'border-r-[3px] border-rb-fg md:border-r-[3px]' : ''} ${i >= 2 ? 'border-t-[3px] border-rb-fg md:border-t-0' : ''}`}
          >
            <p
              className="text-[10px] uppercase tracking-[1px] mb-[6px]"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {label}
            </p>
            <p
              className="text-[14px] font-semibold truncate"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Opportunities */}
      {opps.length === 0 ? (
        <div className="border-[3px] border-dashed border-rb-fg bg-rb-sunken p-sp-6 text-center">
          <Icon path={mdiFileDocumentOutline} size={48} />
          <p className="uppercase font-semibold mt-sp-2 mb-sp-2">No opportunities parsed yet</p>
          {scan.status === 'awaiting_llm_input' && (
            <Link
              href={`/scan/${id}/prompt`}
              className="text-rb-link underline text-[14px] uppercase tracking-[1px]"
            >
              Go to prompt {'->'}
            </Link>
          )}
        </div>
      ) : (
        <section>
          <h3
            className="text-[24px] uppercase mb-sp-3 leading-none"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            OPPORTUNITIES - RANKED BY SCORE
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sp-3">
            {opps.map(opp => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
        </section>
      )}

      {/* Links to raw data */}
      <div className="flex gap-sp-4 text-[12px] uppercase tracking-[1px] border-t-[3px] border-rb-fg pt-sp-3 flex-wrap">
        <Link href={`/scan/${id}/prompt`} className="underline hover:text-rb-link">View prompt</Link>
        {scan.llm_response_raw && (
          <a
            href={`/api/scans/${id}/response/raw`}
            target="_blank"
            rel="noopener"
            className="underline hover:text-rb-link"
          >
            View raw response
          </a>
        )}
        <Link href={`/scan/${id}/response`} className="underline hover:text-rb-link">
          {scan.status === 'completed' ? 'Re-paste response' : 'Paste response'}
        </Link>
      </div>
    </div>
  )
}
