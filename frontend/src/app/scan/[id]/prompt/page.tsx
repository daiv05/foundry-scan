'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Scan } from '@/lib/types'

const LLM_LINKS = [
  { label: 'Claude', href: 'https://claude.ai' },
  { label: 'ChatGPT', href: 'https://chatgpt.com' },
  { label: 'Gemini', href: 'https://gemini.google.com' },
]

function tokenColor(tokens: number): string {
  if (tokens < 8_000)   return 'bg-green-900 text-green-300'
  if (tokens < 32_000)  return 'bg-yellow-900 text-yellow-300'
  if (tokens < 100_000) return 'bg-orange-900 text-orange-300'
  return 'bg-red-900 text-red-300'
}

function tokenModel(tokens: number): string {
  if (tokens < 8_000)   return 'Any modern LLM'
  if (tokens < 32_000)  return 'Claude Sonnet / GPT-4 / Gemini Pro'
  if (tokens < 100_000) return 'Claude (any) / Gemini 1.5+'
  return '⚠ Exceeds 100K — use Claude or Gemini 1.5+'
}

export default function PromptPage() {
  const { id } = useParams<{ id: string }>()
  const [scan, setScan] = useState<Scan | null>(null)
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

  if (error) return <div className="p-8 text-red-400">{error}</div>
  if (!scan)  return <div className="p-8 text-gray-400 animate-pulse">Loading…</div>

  const prompt = scan.prompt_text ?? ''
  const tokens = scan.prompt_tokens_est ?? 0

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-300">Dashboard</Link>
        <span>/</span>
        <Link href={`/scan/${id}`} className="hover:text-gray-300 font-mono">{id}</Link>
        <span>/</span>
        <span className="text-gray-300">Prompt</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Prompt</h1>
          <p className="text-sm text-gray-400 mt-1">
            Copy this and paste it into your LLM, then come back with the response.
          </p>
        </div>
        {tokens > 0 && (
          <div className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums shrink-0 ${tokenColor(tokens)}`}>
            ~{tokens.toLocaleString()} tokens
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="flex gap-4 text-sm text-gray-400">
        {['1. Copy the prompt below', '2. Paste into your LLM', '3. Return here with the response'].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center text-xs font-bold shrink-0">
              {i + 1}
            </span>
            {s.slice(3)}
          </div>
        ))}
      </div>

      {/* Quick LLM links */}
      <div className="flex gap-2 flex-wrap">
        {LLM_LINKS.map(l => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-700 bg-gray-900 hover:border-gray-500 px-4 py-2 text-sm text-gray-300 transition-colors"
          >
            Open {l.label} ↗
          </a>
        ))}
      </div>

      {/* Prompt block */}
      {!prompt ? (
        <div className="rounded-xl border border-yellow-800 bg-yellow-950/40 p-6 text-yellow-400">
          Prompt not ready yet. Make sure the pipeline completed.
        </div>
      ) : (
        <div className="relative group">
          <pre className="rounded-xl border border-gray-700 bg-gray-900 p-5 text-xs text-gray-300 overflow-auto max-h-[60vh] whitespace-pre-wrap break-words leading-relaxed font-mono">
            {prompt}
          </pre>
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={copy}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                copied
                  ? 'bg-green-700 text-green-200'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
            <a
              href={`/api/scans/${id}/export/prompt.txt`}
              download
              className="rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium px-4 py-2 transition-colors"
            >
              ↓ .txt
            </a>
          </div>
        </div>
      )}

      {/* Recommended model */}
      {tokens > 0 && (
        <p className="text-sm text-gray-500">
          Recommended: <span className="text-gray-300">{tokenModel(tokens)}</span>
        </p>
      )}

      {/* Next step */}
      <div className="flex justify-end pt-2">
        <Link
          href={`/scan/${id}/response`}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 text-sm transition-colors"
        >
          I have the response → Paste it
        </Link>
      </div>
    </div>
  )
}
