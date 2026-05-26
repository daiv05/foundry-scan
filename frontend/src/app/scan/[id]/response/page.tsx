'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { mdiCheckBold, mdiClose, mdiFlash, mdiArrowLeft, mdiAlertOctagon } from '@mdi/js'
import { api } from '@/lib/api'
import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'
import { Textarea, Select } from '@/components/ui/Input'
import type { ParseError } from '@/lib/types'

const LLM_OPTIONS = [
  'Claude Opus 4',
  'Claude Sonnet 4',
  'Claude Haiku 3.5',
  'GPT-4o',
  'GPT-4 Turbo',
  'Gemini 1.5 Pro',
  'Gemini 2.0 Flash',
  'Other',
]

function tryExtractJson(text: string): { found: boolean; preview: string } {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) return { found: true, preview: fence[1].trim().slice(0, 300) }
  const start = text.indexOf('{')
  if (start !== -1) return { found: true, preview: text.slice(start, start + 300) }
  return { found: false, preview: '' }
}

export default function ResponsePasterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [text, setText] = useState('')
  const [llmUsed, setLlmUsed] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [parseError, setParseError] = useState<ParseError | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [editMode, setEditMode] = useState(false)

  const detection = tryExtractJson(text)

  const submit = useCallback(async () => {
    if (!text.trim()) return
    setSubmitting(true)
    setParseError(null)
    setWarnings([])
    try {
      const result = await api.submitResponse(id, text, llmUsed)
      if (result.warnings?.length) setWarnings(result.warnings)
      router.push(`/scan/${id}/report`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      try {
        const parsed = JSON.parse(msg)
        setParseError(parsed as ParseError)
      } catch {
        setParseError({ kind: 'invalid_json', message: msg, hint: 'Check the response and try again.' })
      }
      setSubmitting(false)
    }
  }, [id, text, llmUsed, router])

  async function retry() {
    setSubmitting(true)
    setParseError(null)
    try {
      await api.retryParse(id)
      router.push(`/scan/${id}/report`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      try { setParseError(JSON.parse(msg)) } catch { setParseError({ kind: 'invalid_json', message: msg, hint: '' }) }
      setSubmitting(false)
    }
  }

  // suppress unused warning
  void editMode

  return (
    <div className="p-sp-5 max-w-[1000px] mx-auto space-y-sp-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-[8px] text-[12px] uppercase tracking-[1px]">
        <Link href="/" className="underline hover:text-rb-link">Dashboard</Link>
        <span>/</span>
        <Link href={`/scan/${id}/prompt`} className="underline hover:text-rb-link" style={{ fontFamily: 'var(--font-mono)' }}>{id}</Link>
        <span>/</span>
        <span>Response</span>
      </div>

      {/* Header */}
      <div className="pb-sp-3 border-b-[3px] border-rb-fg">
        <h1 className="text-[48px] leading-none">PASTE LLM RESPONSE</h1>
        <p className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mt-[8px]">
          Paste the full response — markdown, code fences, extra text all fine.
        </p>
      </div>

      {/* LLM selector */}
      <Select
        label="LLM USED"
        value={llmUsed}
        onChange={e => setLlmUsed(e.target.value)}
      >
        <option value="">— select —</option>
        {LLM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </Select>

      {/* Textarea + detection */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={e => { setText(e.target.value); setParseError(null) }}
          placeholder="Paste the LLM response here…"
          rows={16}
        />
        {text.length > 10 && (
          <div
            className={
              `absolute top-sp-2 right-sp-2 inline-flex items-center gap-[6px] bg-rb-bg border-[3px] px-[10px] py-[4px] ` +
              `uppercase text-[11px] tracking-[1px] font-semibold ` +
              `${detection.found ? 'border-rb-success text-rb-success' : 'border-rb-error text-rb-error'}`
            }
          >
            <Icon path={detection.found ? mdiCheckBold : mdiClose} size={12} />
            {detection.found ? 'JSON DETECTED' : 'NO JSON FOUND'}
          </div>
        )}
      </div>

      {/* JSON preview */}
      {detection.found && detection.preview && (
        <div className="border-[3px] border-rb-fg bg-rb-sunken p-sp-3">
          <p
            className="text-[10px] uppercase tracking-[1px] mb-sp-2"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            PREVIEW
          </p>
          <pre
            className="text-[12px] whitespace-pre-wrap break-all"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {detection.preview}…
          </pre>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="border-[5px] border-rb-error bg-rb-bg p-sp-3 space-y-sp-2">
          <div className="flex items-center gap-[8px]">
            <Icon path={mdiAlertOctagon} size={20} className="text-rb-error" />
            <p
              className="text-[18px] uppercase text-rb-error"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              PARSE FAILED: {parseError.kind}
            </p>
          </div>
          <p className="text-[14px]">{parseError.message}</p>
          {parseError.hint && (
            <p className="text-[13px] italic text-rb-fg/60">{parseError.hint}</p>
          )}
          <button
            onClick={() => setEditMode(true)}
            className="text-[12px] underline text-rb-link uppercase tracking-[1px]"
          >
            Edit response manually →
          </button>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="border-[3px] border-rb-warning bg-rb-bg p-sp-3 space-y-[4px]">
          <p
            className="text-[14px] uppercase text-rb-warning"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            WARNINGS (AUTO-CORRECTED)
          </p>
          {warnings.map((w, i) => <p key={i} className="text-[12px]">• {w}</p>)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-sp-2 justify-end flex-wrap pt-sp-2">
        <Link href={`/scan/${id}/prompt`}>
          <Button variant="secondary">
            <Icon path={mdiArrowLeft} size={14} /> BACK TO PROMPT
          </Button>
        </Link>
        {parseError && (
          <Button variant="secondary" onClick={retry} disabled={submitting}>
            RETRY STORED RESPONSE
          </Button>
        )}
        <Button
          onClick={submit}
          disabled={submitting || !text.trim()}
          size="md"
        >
          <Icon path={mdiFlash} size={16} />
          {submitting ? 'PARSING…' : 'PARSE & SAVE'}
        </Button>
      </div>
    </div>
  )
}
