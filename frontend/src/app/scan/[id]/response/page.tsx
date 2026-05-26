'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
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
  // Try fence first
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) return { found: true, preview: fence[1].trim().slice(0, 300) }
  // Try balanced brace
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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-300">Dashboard</Link>
        <span>/</span>
        <Link href={`/scan/${id}/prompt`} className="hover:text-gray-300 font-mono">{id}</Link>
        <span>/</span>
        <span className="text-gray-300">Response</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Paste LLM Response</h1>
        <p className="text-sm text-gray-400 mt-1">
          Paste the full response — markdown, code fences, extra text all fine.
        </p>
      </div>

      {/* LLM selector */}
      <div className="flex gap-3 items-center flex-wrap">
        <label className="text-sm text-gray-400 shrink-0">LLM used:</label>
        <select
          value={llmUsed}
          onChange={e => setLlmUsed(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">— select —</option>
          {LLM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setParseError(null) }}
          placeholder="Paste the LLM response here…"
          rows={16}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm text-gray-300 placeholder-gray-600 font-mono focus:outline-none focus:border-blue-500 resize-y transition-colors"
        />
        {/* Detection indicator */}
        {text.length > 10 && (
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            detection.found
              ? 'bg-green-900 text-green-300'
              : 'bg-red-900 text-red-400'
          }`}>
            {detection.found ? '✓ JSON detected' : '✗ No JSON found'}
          </div>
        )}
      </div>

      {/* JSON preview */}
      {detection.found && detection.preview && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Preview</p>
          <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">{detection.preview}…</pre>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-5 space-y-3">
          <p className="font-semibold text-red-300">Parse failed: {parseError.kind}</p>
          <p className="text-sm text-red-400">{parseError.message}</p>
          {parseError.hint && (
            <p className="text-sm text-red-400/70 italic">{parseError.hint}</p>
          )}
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Edit response manually →
            </button>
          )}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-yellow-800 bg-yellow-950/40 p-4 space-y-1">
          <p className="text-sm font-semibold text-yellow-300">Warnings (auto-corrected):</p>
          {warnings.map((w, i) => <p key={i} className="text-xs text-yellow-400">• {w}</p>)}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end flex-wrap">
        <Link
          href={`/scan/${id}/prompt`}
          className="rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 font-medium px-5 py-2.5 text-sm transition-colors"
        >
          ← Back to prompt
        </Link>
        {parseError && (
          <button
            onClick={retry}
            disabled={submitting}
            className="rounded-lg border border-blue-700 hover:border-blue-500 text-blue-300 font-medium px-5 py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            Retry stored response
          </button>
        )}
        <button
          onClick={submit}
          disabled={submitting || !text.trim()}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition-colors"
        >
          {submitting ? 'Parsing…' : '⚡ Parse & Save'}
        </button>
      </div>
    </div>
  )
}
