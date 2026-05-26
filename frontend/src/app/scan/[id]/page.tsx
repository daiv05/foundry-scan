'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Scan, ScanStatus } from '@/lib/types'

const STEPS: { status: ScanStatus | 'done'; label: string }[] = [
  { status: 'pending',            label: 'Queued' },
  { status: 'collecting',         label: 'Collecting data' },
  { status: 'processing',         label: 'Processing & clustering' },
  { status: 'awaiting_llm_input', label: 'Building prompt' },
  { status: 'parsing',            label: 'Parsing response' },
  { status: 'completed',          label: 'Completed' },
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
      <div className="p-8 max-w-xl mx-auto">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="text-blue-400 text-sm mt-4 block">← Back to dashboard</Link>
      </div>
    )
  }

  if (!scan) {
    return (
      <div className="p-8 max-w-xl mx-auto text-gray-400 text-sm animate-pulse">
        Loading scan…
      </div>
    )
  }

  const currentIdx = stepIndex(scan.status)

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Dashboard</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm font-mono">{id}</span>
      </div>

      <h1 className="text-2xl font-bold text-white mt-4 mb-2">Scan in progress</h1>
      <p className="text-sm text-gray-400 mb-8">
        This page auto-updates every 3 seconds.
      </p>

      {/* Progress steps */}
      <div className="space-y-3 mb-10">
        {STEPS.filter(s => s.status !== 'done').map((step, i) => {
          const done    = i < currentIdx
          const active  = i === currentIdx
          const waiting = i > currentIdx

          return (
            <div key={step.status} className="flex items-center gap-4">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done    ? 'bg-green-700 text-green-200' :
                  active  ? 'bg-blue-600 text-white animate-pulse' :
                            'bg-gray-800 text-gray-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm ${
                  done    ? 'text-green-400' :
                  active  ? 'text-white font-medium' :
                            'text-gray-600'
                }`}
              >
                {step.label}
                {active && !waiting && <span className="ml-2 text-gray-500">…</span>}
              </span>
            </div>
          )
        })}
      </div>

      {/* Terminal states */}
      {scan.status === 'awaiting_llm_input' && (
        <div className="rounded-xl border border-yellow-700 bg-yellow-950/40 p-6 space-y-4">
          <p className="font-semibold text-yellow-300">✅ Prompt is ready!</p>
          <p className="text-sm text-yellow-400/80">
            Copy the prompt and paste it into your LLM of choice. Then come back with the response.
          </p>
          <div className="flex gap-3">
            <Link
              href={`/scan/${id}/prompt`}
              className="rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-medium px-5 py-2.5 text-sm transition-colors"
            >
              Open prompt →
            </Link>
          </div>
        </div>
      )}

      {scan.status === 'failed' && (
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-6">
          <p className="font-semibold text-red-300 mb-2">Scan failed</p>
          <p className="text-sm text-red-400 font-mono">{scan.error_message || 'Unknown error'}</p>
          <Link href="/scan/new" className="mt-4 text-sm text-blue-400 hover:text-blue-300 block">
            Start a new scan →
          </Link>
        </div>
      )}
    </div>
  )
}
