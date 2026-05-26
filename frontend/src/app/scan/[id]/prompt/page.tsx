'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { mdiContentCopy, mdiCheckBold, mdiDownload, mdiOpenInNew, mdiArrowRight } from '@mdi/js'
import { api } from '@/lib/api'
import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'
import type { Scan } from '@/lib/types'

const LLM_LINKS = [
  { label: 'CLAUDE',  href: 'https://claude.ai' },
  { label: 'CHATGPT', href: 'https://chatgpt.com' },
  { label: 'GEMINI',  href: 'https://gemini.google.com' },
]

function tokenColor(tokens: number): string {
  if (tokens < 8_000)   return 'border-rb-success text-rb-success'
  if (tokens < 32_000)  return 'border-rb-warning text-rb-warning'
  if (tokens < 100_000) return 'border-rb-warning text-rb-warning'
  return 'border-rb-error text-rb-error'
}

function tokenModel(tokens: number): string {
  if (tokens < 8_000)   return 'ANY MODERN LLM'
  if (tokens < 32_000)  return 'CLAUDE SONNET / GPT-4 / GEMINI PRO'
  if (tokens < 100_000) return 'CLAUDE (ANY) / GEMINI 1.5+'
  return '⚠ EXCEEDS 100K — USE CLAUDE OR GEMINI 1.5+'
}

export default function PromptPage() {
  const { id } = useParams<{ id: string }>()
  const [scan, setScan]   = useState<Scan | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getScan(id).then(setScan).catch(e => setError(e.message))
  }, [id])

  async function copy() {
    if (!scan?.prompt_text) return
    await navigator.clipboard.writeText(scan.prompt_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (error) return <div className="p-sp-5 text-rb-error">{error}</div>
  if (!scan)  return <div className="p-sp-5 uppercase tracking-[1px]">Loading…</div>

  const prompt = scan.prompt_text ?? ''
  const tokens = scan.prompt_tokens_est ?? 0

  return (
    <div className="p-sp-5 max-w-[1000px] mx-auto space-y-sp-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-[8px] text-[12px] uppercase tracking-[1px]">
        <Link href="/" className="underline hover:text-rb-link">Dashboard</Link>
        <span>/</span>
        <Link href={`/scan/${id}`} className="underline hover:text-rb-link" style={{ fontFamily: 'var(--font-mono)' }}>{id}</Link>
        <span>/</span>
        <span>Prompt</span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between gap-sp-3 flex-wrap pb-sp-3 border-b-[3px] border-rb-fg">
        <div>
          <h1 className="text-[48px] leading-none">YOUR PROMPT</h1>
          <p className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mt-[8px]">
            Copy this, paste into your LLM, then come back with the response.
          </p>
        </div>
        {tokens > 0 && (
          <div
            className={`bg-rb-bg border-[3px] ${tokenColor(tokens)} px-[14px] py-[6px] text-[16px] font-bold tabular-nums shrink-0`}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ~{tokens.toLocaleString()} TOKENS
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-sp-3">
        {[
          'COPY THE PROMPT BELOW',
          'PASTE INTO YOUR LLM',
          'RETURN HERE WITH THE RESPONSE',
        ].map((step, i) => (
          <div key={i} className="border-[3px] border-rb-fg p-sp-3 flex items-start gap-sp-2">
            <span
              className="w-[36px] h-[36px] border-[3px] border-rb-fg bg-rb-fg text-rb-bg flex items-center justify-center text-[16px] font-bold shrink-0"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {i + 1}
            </span>
            <span
              className="text-[14px] uppercase tracking-[1px] leading-tight pt-[4px]"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {step}
            </span>
          </div>
        ))}
      </div>

      {/* Quick LLM links */}
      <div className="flex gap-sp-2 flex-wrap">
        {LLM_LINKS.map(l => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-[6px] bg-rb-bg text-rb-fg border-[3px] border-rb-fg px-sp-3 py-[8px] uppercase text-[12px] tracking-[2px] font-semibold hover:bg-rb-fg hover:text-rb-bg"
          >
            OPEN {l.label} <Icon path={mdiOpenInNew} size={14} />
          </a>
        ))}
      </div>

      {/* Prompt block */}
      {!prompt ? (
        <div className="border-[3px] border-rb-warning bg-rb-bg p-sp-4 text-rb-fg">
          Prompt not ready yet. Make sure the pipeline completed.
        </div>
      ) : (
        <div className="relative">
          <pre
            className="bg-rb-sunken border-[3px] border-rb-fg p-sp-4 text-[13px] text-rb-fg overflow-auto max-h-[60vh] whitespace-pre-wrap break-words leading-relaxed"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {prompt}
          </pre>
          <div className="absolute top-sp-2 right-sp-2 flex gap-[8px]">
            <button
              onClick={copy}
              className={
                `inline-flex items-center gap-[6px] border-[3px] border-rb-fg px-[14px] py-[6px] uppercase text-[12px] tracking-[2px] font-semibold ` +
                `${copied ? 'bg-rb-success text-white' : 'bg-rb-bg text-rb-fg hover:bg-rb-fg hover:text-rb-bg'}`
              }
            >
              <Icon path={copied ? mdiCheckBold : mdiContentCopy} size={14} />
              {copied ? 'COPIED' : 'COPY'}
            </button>
            <a
              href={`/api/scans/${id}/export/prompt.txt`}
              download
              className="inline-flex items-center gap-[6px] bg-rb-bg text-rb-fg border-[3px] border-rb-fg px-[14px] py-[6px] uppercase text-[12px] tracking-[2px] font-semibold hover:bg-rb-fg hover:text-rb-bg"
            >
              <Icon path={mdiDownload} size={14} />
              .TXT
            </a>
          </div>
        </div>
      )}

      {/* Recommended model */}
      {tokens > 0 && (
        <p className="text-[12px] uppercase tracking-[1px]">
          RECOMMENDED:{' '}
          <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
            {tokenModel(tokens)}
          </span>
        </p>
      )}

      {/* Next step */}
      <div className="flex justify-end pt-sp-2">
        <Link href={`/scan/${id}/response`}>
          <Button size="lg">
            I HAVE THE RESPONSE → PASTE IT
            <Icon path={mdiArrowRight} size={18} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
