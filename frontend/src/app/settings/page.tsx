'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { SettingsStatus, ScanConfig } from '@/lib/types'

// ── Source status badge ───────────────────────────────────────────────────────

function SourceBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ready:          { label: 'Ready',          cls: 'bg-green-900/50 text-green-400 border-green-800' },
    configured:     { label: 'Configured',     cls: 'bg-blue-900/50 text-blue-400 border-blue-800' },
    not_configured: { label: 'Not configured', cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-800' },
    error:          { label: 'Error',          cls: 'bg-red-900/40 text-red-400 border-red-800' },
  }
  const s = map[status] ?? map.error
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ── Source icons ──────────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<string, string> = {
  reddit:      '🟠',
  hackernews:  '🟡',
  trends:      '📈',
  producthunt: '🐱',
}

// ── Default subreddits editor ─────────────────────────────────────────────────

const FALLBACK_SUBREDDITS = ['SaaS', 'Entrepreneur', 'smallbusiness', 'freelance', 'webdev']

function SubredditsEditor({ configs, onSaved }: { configs: ScanConfig[]; onSaved: () => void }) {
  const existing = configs.find(c => c.is_default)
  const savedList: string[] = (existing?.config?.subreddits as string[]) ?? FALLBACK_SUBREDDITS

  const [subreddits, setSubreddits] = useState<string[]>(savedList)
  const [newItem, setNewItem]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')

  // sync when parent data refreshes
  useEffect(() => {
    const list = (configs.find(c => c.is_default)?.config?.subreddits as string[]) ?? FALLBACK_SUBREDDITS
    setSubreddits(list)
  }, [configs])

  function add() {
    const v = newItem.trim().replace(/^r\//i, '')
    if (!v || subreddits.includes(v)) return
    setSubreddits(prev => [...prev, v])
    setNewItem('')
  }

  function remove(sr: string) {
    setSubreddits(prev => prev.filter(s => s !== sr))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: 'Default',
        config: { subreddits },
        is_default: true,
      }
      if (existing) {
        await api.updateConfig(existing.id, payload)
      } else {
        await api.createConfig(payload)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current tags */}
      <div className="flex flex-wrap gap-2">
        {subreddits.map(sr => (
          <span
            key={sr}
            className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-200"
          >
            r/{sr}
            <button
              onClick={() => remove(sr)}
              className="text-gray-500 hover:text-red-400 transition-colors leading-none"
              title={`Remove r/${sr}`}
            >
              ×
            </button>
          </span>
        ))}
        {subreddits.length === 0 && (
          <span className="text-sm text-gray-500 italic">No subreddits — add at least one</span>
        )}
      </div>

      {/* Add input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add subreddit (e.g. startups)"
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={add}
          className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Add
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {saving ? 'Saving…' : 'Save defaults'}
        </button>
        {saved && <span className="text-sm text-green-400">✓ Saved</span>}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [status, setStatus]   = useState<SettingsStatus | null>(null)
  const [configs, setConfigs] = useState<ScanConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.getSettingsStatus(), api.getConfigs()])
      setStatus(s)
      setConfigs(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded bg-gray-800 animate-pulse" />
        <div className="h-4 w-72 rounded bg-gray-800 animate-pulse" />
        <div className="grid sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-red-400 text-sm rounded-lg border border-red-800 bg-red-950/40 px-4 py-3">{error}</p>
      </div>
    )
  }

  const sources      = status?.sources ?? {}
  const envVars      = status?.env_vars ?? {}
  const instructions = status?.instructions

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">
          Configuration lives in{' '}
          <code className="rounded bg-gray-800 px-1 py-0.5 text-gray-300">backend/.env</code>.
          {' '}This page shows live status and lets you manage scan defaults.
        </p>
      </div>

      {/* ── Data Sources ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4">Data Sources</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(sources).map(([key, src]) => (
            <div
              key={key}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{SOURCE_ICONS[key] ?? '🔌'}</span>
                  <span className="font-medium text-white text-sm">{src.name}</span>
                </div>
                <SourceBadge status={src.status} />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{src.method}</p>
              {Object.keys(src.config).length > 0 && (
                <div className="rounded-lg bg-gray-800 px-3 py-2 space-y-1">
                  {Object.entries(src.config).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-gray-500">{k}</span>
                      <span className={`font-mono ${v === true ? 'text-green-400' : v === false ? 'text-gray-500' : 'text-gray-200'}`}>
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Environment Variables ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-1">Environment Variables</h2>
        <p className="text-xs text-gray-500 mb-4">
          Read-only — values come from{' '}
          <code className="bg-gray-800 rounded px-1 text-gray-300">backend/.env</code>.
          Token values are never exposed, only presence.
        </p>

        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Variable</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Value / Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-900/50">
              {Object.entries(envVars).map(([name, info]) => (
                <tr key={name} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300 whitespace-nowrap align-top pt-4">{name}</td>
                  <td className="px-4 py-3 align-top pt-4">
                    {'set' in info ? (
                      info.set ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
                          ✓ Set
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-400 font-medium">
                            — Not set
                          </span>
                          {!info.required && (
                            <span className="ml-1.5 text-xs text-gray-500">(optional)</span>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="font-mono text-xs text-gray-200">
                        {String(info.value ?? info.default ?? '—')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell align-top pt-4">
                    {info.description}
                    {info.hint && info.hint.startsWith('http') && (
                      <a
                        href={info.hint}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-400 hover:underline mt-1"
                      >
                        ↗ Get token
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Update instructions */}
        {instructions && (
          <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">How to update a value</p>
            <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
              <li>
                Edit{' '}
                <code className="bg-gray-800 rounded px-1 text-gray-300">backend/.env</code>
              </li>
              <li>
                Run:{' '}
                <code className="bg-gray-800 rounded px-1.5 py-0.5 text-green-300 text-xs select-all">
                  docker compose up -d --force-recreate backend
                </code>
              </li>
              <li>Reload this page to verify the new values.</li>
            </ol>
            <div className="flex items-start gap-2 rounded-lg bg-yellow-900/20 border border-yellow-800/50 px-3 py-2">
              <span className="text-yellow-400 text-xs">⚠</span>
              <p className="text-xs text-yellow-300/80">
                <code className="bg-gray-800 rounded px-1 text-gray-200">docker compose restart</code>{' '}
                does NOT re-read <code className="bg-gray-800 rounded px-1 text-gray-200">env_file</code>.
                Always use <code className="bg-gray-800 rounded px-1 text-gray-200">--force-recreate</code>.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Scan Defaults ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-1">Scan Defaults</h2>
        <p className="text-xs text-gray-500 mb-4">
          Default subreddits pre-selected when creating a new scan. Stored in the database.
        </p>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <SubredditsEditor configs={configs} onSaved={load} />
        </div>
      </section>

    </div>
  )
}
