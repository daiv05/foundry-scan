'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { mdiCheckBold, mdiArrowRight, mdiAlertOctagon } from '@mdi/js'
import { api } from '@/lib/api'
import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'
import type { Scan, ScanStatus } from '@/lib/types'

const STEPS: { status: ScanStatus | 'done'; label: string }[] = [
  { status: 'pending',            label: 'QUEUED' },
  { status: 'collecting',         label: 'COLLECTING DATA' },
  { status: 'processing',         label: 'PROCESSING & CLUSTERING' },
  { status: 'awaiting_llm_input', label: 'BUILDING PROMPT' },
  { status: 'parsing',            label: 'PARSING RESPONSE' },
  { status: 'completed',          label: 'COMPLETED' },
]

const TERMINAL: ScanStatus[] = ['awaiting_llm_input', 'completed', 'failed']

function stepIndex(status: ScanStatus): number {
  return STEPS.findIndex(s => s.status === status)
}

export default function ScanProgressPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [scan, setScan] = useState<Scan | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>

    async function poll() {
      try {
        const data = await api.getScan(id)
        setScan(data)
        if (TERMINAL.includes(data.status)) {
          clearInterval(timer)
          if (data.status === 'completed') {
            router.replace(`/scan/${id}/report`)
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch scan')
        clearInterval(timer)
      }
    }

    poll()
    timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [id, router])

  if (error) {
    return (
      <div className="p-sp-5 max-w-[640px] mx-auto">
        <div className="border-[3px] border-rb-error bg-rb-bg text-rb-error p-sp-3">{error}</div>
        <Link href="/" className="text-rb-link underline text-[14px] mt-sp-3 inline-block">← Back to dashboard</Link>
      </div>
    )
  }

  if (!scan) {
    return (
      <div className="p-sp-5 max-w-[640px] mx-auto text-rb-fg uppercase text-[14px] tracking-[1px]">
        Loading scan…
      </div>
    )
  }

  const currentIdx = stepIndex(scan.status)

  return (
    <div className="p-sp-5 max-w-[640px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-[8px] text-[12px] uppercase tracking-[1px] mb-sp-3">
        <Link href="/" className="underline hover:text-rb-link">Dashboard</Link>
        <span>/</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{id}</span>
      </div>

      <h1 className="text-[30px] md:text-[48px] leading-none mb-sp-2">SCAN IN PROGRESS</h1>
      <p className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mb-sp-5">
        Auto-updates every 3 seconds
      </p>

      {/* Progress steps */}
      <div className="border-[3px] border-rb-fg bg-rb-bg mb-sp-5">
        {STEPS.filter(s => s.status !== 'done').map((step, i) => {
          const done   = i < currentIdx
          const active = i === currentIdx

          return (
            <div
              key={step.status}
              className={`flex items-center gap-sp-3 px-sp-3 py-sp-3 ${i > 0 ? 'border-t-[3px] border-rb-fg' : ''} ${active ? 'bg-rb-warning' : done ? 'bg-rb-bg' : 'bg-rb-sunken'}`}
            >
              <div
                className={
                  `w-[36px] h-[36px] border-[3px] border-rb-fg flex items-center justify-center text-[14px] font-bold shrink-0 ` +
                  `${done ? 'bg-rb-success text-white' : active ? 'bg-rb-fg text-rb-bg' : 'bg-rb-bg text-rb-fg/40'}`
                }
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {done ? <Icon path={mdiCheckBold} size={18} /> : i + 1}
              </div>
              <span
                className={`text-[14px] uppercase tracking-[1px] ${active ? 'font-bold text-black' : done ? 'text-rb-fg' : 'text-rb-fg/40'}`}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {step.label}
                {active && <span className="ml-[8px]">…</span>}
              </span>
            </div>
          )
        })}
      </div>

      {/* Terminal states */}
      {scan.status === 'awaiting_llm_input' && (
        <div className="border-[5px] border-rb-fg bg-rb-warning p-sp-4 space-y-sp-3">
          <p
            className="text-[24px] leading-none uppercase"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            PROMPT IS READY
          </p>
          <p className="text-[14px]">
            Copy the prompt and paste it into your LLM of choice. Then come back with the response.
          </p>
          <Link
            href={`/scan/${id}/prompt`}
            className="inline-flex items-center gap-[8px] bg-rb-fg text-rb-bg border-[3px] border-rb-fg px-sp-4 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-bg hover:text-rb-fg"
          >
            OPEN PROMPT <Icon path={mdiArrowRight} size={16} />
          </Link>
        </div>
      )}

      {scan.status === 'failed' && (
        <div className="border-[5px] border-rb-error bg-rb-bg p-sp-4">
          <div className="flex items-center gap-[8px] mb-sp-2">
            <Icon path={mdiAlertOctagon} size={24} className="text-rb-error" />
            <p className="text-[24px] uppercase text-rb-error" style={{ fontFamily: 'var(--font-headline)' }}>
              SCAN FAILED
            </p>
          </div>
          <p
            className="text-[13px] bg-rb-sunken border-[2px] border-rb-fg p-sp-2 break-words"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {scan.error_message || 'Unknown error'}
          </p>
          <Link
            href="/scan/new"
            className="mt-sp-3 inline-flex items-center gap-[8px] underline text-rb-link text-[14px] uppercase tracking-[1px]"
          >
            Start a new scan -->
          </Link>
        </div>
      )}

      <div className="mt-sp-5">
        <Button variant="ghost" onClick={() => router.push('/')}>← Back to Dashboard</Button>
      </div>
    </div>
  )
}
