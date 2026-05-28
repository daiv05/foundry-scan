import Link from 'next/link'
import { mdiFlash, mdiArrowRight, mdiPlus, mdiRocketLaunchOutline } from '@mdi/js'
import { ssrGetScans, ssrGetOpportunities } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import OpportunityCard from '@/components/OpportunityCard'
import Icon from '@/components/ui/Icon'
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
    <div className="bg-rb-warning text-black border-[5px] border-rb-fg px-sp-4 py-sp-3 flex items-start gap-sp-3">
      <Icon path={mdiFlash} size={28} className="shrink-0 mt-[2px]" />
      <div className="flex-1 min-w-0">
        <p
          className="text-[20px] uppercase leading-tight"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {waiting.length === 1 ? 'A SCAN' : `${waiting.length} SCANS`} READY FOR LLM
        </p>
        <p className="text-[14px] mt-[4px]">
          Copy the prompt, paste it into your LLM, then come back with the response.
        </p>
      </div>
      <Link
        href={`/scan/${waiting[0].id}/prompt`}
        className="shrink-0 inline-flex items-center gap-[6px] bg-rb-fg text-rb-bg border-[3px] border-rb-fg px-sp-3 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-bg hover:text-rb-fg"
      >
        OPEN <Icon path={mdiArrowRight} size={16} />
      </Link>
    </div>
  )
}

export default async function DashboardPage() {
  const [scans, topOpps] = await Promise.all([
    ssrGetScans({ perPage: 5, archived: false }).catch(() => []),
    ssrGetOpportunities({ perPage: 6, sort: '-score' }).catch(() => []),
  ])

  return (
    <div className="p-sp-5 max-w-[1100px] mx-auto space-y-sp-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-sp-3 flex-wrap pb-sp-4 border-b-[3px] border-rb-fg">
        <div>
          <h1 className="text-[40px] md:text-[64px] leading-none">DASHBOARD</h1>
          <p className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mt-[8px]">
            Your micro-SaaS opportunity pipeline
          </p>
        </div>
        <Link
          href="/scan/new"
          className="inline-flex items-center gap-[8px] bg-rb-fg text-rb-bg border-[3px] border-rb-fg px-sp-3 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-bg hover:text-rb-fg"
        >
          <Icon path={mdiPlus} size={18} /> NEW SCAN
        </Link>
      </div>

      {scans.length > 0 && <PendingBanner scans={scans} />}

      {/* Recent scans */}
      <section>
        <div className="flex items-end justify-between mb-sp-3">
          <h3
            className="text-[24px] uppercase leading-none"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            RECENT SCANS
          </h3>
          <Link
            href="/scans"
            className="text-[12px] uppercase tracking-[1px] underline hover:text-rb-link"
          >
            View all {'->'}
          </Link>
        </div>

        {scans.length === 0 ? (
          <div className="border-[3px] border-dashed border-rb-fg p-sp-6 text-center bg-rb-sunken">
            <Icon path={mdiRocketLaunchOutline} size={48} className="text-rb-fg mb-sp-3" />
            <p className="text-[18px] mb-sp-3 uppercase font-semibold">No scans yet</p>
            <Link
              href="/scan/new"
              className="inline-flex items-center gap-[8px] bg-rb-fg text-rb-bg border-[3px] border-rb-fg px-sp-4 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-bg hover:text-rb-fg"
            >
              LAUNCH FIRST SCAN <Icon path={mdiArrowRight} size={16} />
            </Link>
          </div>
        ) : (
          <div className="border-[3px] border-rb-fg">
            {scans.map((scan, i) => (
              <Link
                key={scan.id}
                href={
                  scan.status === 'completed'
                    ? `/scan/${scan.id}/report`
                    : scan.status === 'awaiting_llm_input'
                    ? `/scan/${scan.id}/prompt`
                    : `/scan/${scan.id}`
                }
                className={`flex items-center justify-between px-sp-3 py-sp-3 hover:bg-rb-fg hover:text-rb-bg ${i > 0 ? 'border-t-[3px] border-rb-fg' : ''}`}
              >
                <div className="flex items-center gap-sp-3 min-w-0">
                  <StatusBadge status={scan.status} />
                  <span
                    className="text-[14px] truncate"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {scan.id}
                  </span>
                </div>
                <div className="flex items-center gap-sp-4 shrink-0 text-[12px] uppercase tracking-[1px]">
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
          <div className="flex items-end justify-between mb-sp-3">
            <h3
              className="text-[24px] uppercase leading-none"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              TOP OPPORTUNITIES
            </h3>
            <Link
              href="/opportunities"
              className="text-[12px] uppercase tracking-[1px] underline hover:text-rb-link"
            >
              View all {'->'}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sp-3">
            {topOpps.map(opp => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
        </section>
      )}

      {topOpps.length === 0 && scans.length > 0 && (
        <section>
          <div className="border-[3px] border-dashed border-rb-fg p-sp-6 text-center bg-rb-sunken">
            <p className="uppercase font-semibold mb-[6px]">No opportunities yet</p>
            <p className="text-[14px] text-rb-fg/60">
              Complete a scan and submit the LLM response to see results here.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
