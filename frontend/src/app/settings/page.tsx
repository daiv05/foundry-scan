'use client'

import { useEffect, useState, useCallback } from 'react'
import { mdiCheckBold, mdiClose, mdiAlert, mdiReddit, mdiNewspaperVariantOutline, mdiTrendingUp, mdiCart, mdiOpenInNew, mdiPlus } from '@mdi/js'
import { api } from '@/lib/api'
import type { SettingsStatus, ScanConfig } from '@/lib/types'
import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/Chip'

// ── Source icons (MDI) ───────────────────────────────────────────────────

const SOURCE_ICONS: Record<string, string> = {
  reddit:      mdiReddit,
  hackernews:  mdiNewspaperVariantOutline,
  trends:      mdiTrendingUp,
  producthunt: mdiCart,
}

type Kind = 'active' | 'warning' | 'error' | 'default'

function sourceKind(status: string): Kind {
  if (status === 'ready' || status === 'configured') return 'active'
  if (status === 'not_configured') return 'warning'
  if (status === 'error') return 'error'
  return 'default'
}

// ── Default subreddits editor ───────────────────────────────────────────

const FALLBACK_SUBREDDITS = ['SaaS', 'Entrepreneur', 'smallbusiness', 'freelance', 'webdev']

function SubredditsEditor({ configs, onSaved }: { configs: ScanConfig[]; onSaved: () => void }) {
  const existing = configs.find(c => c.is_default)
  const savedList: string[] = (existing?.config?.subreddits as string[]) ?? FALLBACK_SUBREDDITS

  const [subreddits, setSubreddits] = useState<string[]>(savedList)
  const [newItem, setNewItem]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')

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
    <div className="space-y-sp-3">
      <div className="flex flex-wrap gap-[6px]">
        {subreddits.length === 0 ? (
          <span className="text-[14px] italic text-rb-fg/60">No subreddits - add at least one</span>
        ) : (
          subreddits.map(sr => (
            <span
              key={sr}
              className="inline-flex items-center gap-[6px] bg-rb-bg border-[2px] border-rb-fg px-[10px] py-[4px] text-[12px] uppercase tracking-[1px] font-semibold"
            >
              R/{sr}
              <button
                onClick={() => remove(sr)}
                className="text-rb-fg hover:text-rb-error inline-flex"
                title={`Remove r/${sr}`}
              >
                <Icon path={mdiClose} size={12} />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="flex gap-[8px]">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add subreddit (e.g. startups)"
          className="flex-1 bg-rb-sunken border-[3px] border-rb-fg px-[12px] py-[10px] text-[15px] outline-none focus:[outline:2px_solid_currentColor] focus:[outline-offset:0] placeholder:text-rb-fg/40"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        <Button variant="secondary" size="md" onClick={add}>
          <Icon path={mdiPlus} size={16} /> ADD
        </Button>
      </div>

      {error && <p className="text-[13px] text-rb-error">{error}</p>}

      <div className="flex items-center gap-sp-3">
        <Button onClick={save} disabled={saving} size="md">
          {saving ? 'SAVING…' : 'SAVE DEFAULTS'}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-[6px] text-[12px] uppercase tracking-[1px] text-rb-success">
            <Icon path={mdiCheckBold} size={14} /> SAVED
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────

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
    return <div className="p-sp-5 uppercase tracking-[1px]">Loading…</div>
  }

  if (error) {
    return (
      <div className="p-sp-5">
        <div className="border-[3px] border-rb-error bg-rb-bg text-rb-error p-sp-3">{error}</div>
      </div>
    )
  }

  const sources      = status?.sources ?? {}
  const envVars      = status?.env_vars ?? {}
  const instructions = status?.instructions

  return (
    <div className="p-sp-5 max-w-[960px] mx-auto space-y-sp-5">
      {/* Header */}
      <div className="pb-sp-4 border-b-[3px] border-rb-fg">
        <h1 className="text-[40px] md:text-[64px] leading-none">SETTINGS</h1>
        <p className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mt-[8px]">
          Configuration lives in{' '}
          <code className="bg-rb-fg text-rb-bg px-[6px] py-[2px]" style={{ fontFamily: 'var(--font-mono)' }}>
            backend/.env
          </code>
        </p>
      </div>

      {/* ── Data Sources ──────────────────────────────────────────────── */}
      <section>
        <h3
          className="text-[24px] uppercase mb-sp-3 leading-none"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          DATA SOURCES
        </h3>
        <div className="grid gap-0 sm:grid-cols-2 border-[3px] border-rb-fg">
          {Object.entries(sources).map(([key, src], i) => (
            <div
              key={key}
              className={`bg-rb-bg p-sp-3 ${i % 2 === 0 ? 'sm:border-r-[3px] sm:border-rb-fg' : ''} ${i >= 2 ? 'border-t-[3px] border-rb-fg' : ''} ${i === 1 ? 'border-t-[3px] sm:border-t-0' : ''}`}
            >
              <div className="flex items-start justify-between mb-sp-2 gap-sp-2">
                <div className="flex items-center gap-[10px] min-w-0">
                  <Icon path={SOURCE_ICONS[key]} size={24} />
                  <span
                    className="text-[18px] uppercase leading-none"
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {src.name.toUpperCase()}
                  </span>
                </div>
                <StatusChip kind={sourceKind(src.status)}>{src.status.replace('_', ' ')}</StatusChip>
              </div>
              <p className="text-[12px] text-rb-fg/70 leading-relaxed mb-sp-2">{src.method}</p>
              {Object.keys(src.config).length > 0 && (
                <div className="bg-rb-sunken border-[2px] border-rb-fg px-[10px] py-[8px] space-y-[2px]">
                  {Object.entries(src.config).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                      <span className="text-rb-fg/60 uppercase">{k}</span>
                      <span className={`font-bold ${v === true ? 'text-rb-success' : v === false ? 'text-rb-fg/50' : 'text-rb-fg'}`}>
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

      {/* ── Environment Variables ──────────────────────────────────────── */}
      <section>
        <h3
          className="text-[24px] uppercase mb-sp-2 leading-none"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          ENV VARIABLES
        </h3>
        <p className="text-[12px] uppercase tracking-[1px] text-rb-fg/60 mb-sp-3">
          READ-ONLY • TOKENS NEVER EXPOSED
        </p>

        <div className="border-[3px] border-rb-fg bg-rb-bg overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b-[3px] border-rb-fg bg-rb-fg text-rb-bg">
                <th className="px-sp-3 py-[10px] text-left text-[11px] uppercase tracking-[1px]">Variable</th>
                <th className="px-sp-3 py-[10px] text-left text-[11px] uppercase tracking-[1px]">Status</th>
                <th className="px-sp-3 py-[10px] text-left text-[11px] uppercase tracking-[1px] hidden sm:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(envVars).map(([name, info], i) => (
                <tr key={name} className={i > 0 ? 'border-t-[2px] border-rb-fg' : ''}>
                  <td className="px-sp-3 py-sp-2 align-top" style={{ fontFamily: 'var(--font-mono)' }}>
                    {name}
                  </td>
                  <td className="px-sp-3 py-sp-2 align-top">
                    {'set' in info ? (
                      info.set ? (
                        <span className="inline-flex items-center gap-[4px] text-rb-success font-bold uppercase text-[12px] tracking-[1px]">
                          <Icon path={mdiCheckBold} size={14} /> SET
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-[4px] text-rb-warning font-bold uppercase text-[12px] tracking-[1px]">
                          <Icon path={mdiClose} size={14} /> NOT SET
                        </span>
                      )
                    ) : (
                      <span className="text-rb-fg font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                        {String(info.value ?? info.default ?? '-')}
                      </span>
                    )}
                  </td>
                  <td className="px-sp-3 py-sp-2 text-[12px] text-rb-fg/70 hidden sm:table-cell align-top">
                    {info.description}
                    {info.hint && info.hint.startsWith('http') && (
                      <a
                        href={info.hint}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-[4px] underline text-rb-link mt-[4px]"
                      >
                        <Icon path={mdiOpenInNew} size={12} /> Get token
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {instructions && (
          <div className="mt-sp-3 border-[3px] border-rb-fg bg-rb-bg p-sp-3 space-y-sp-2">
            <p
              className="text-[12px] uppercase tracking-[1px]"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              HOW TO UPDATE
            </p>
            <ol className="text-[13px] space-y-[6px] list-decimal list-inside">
              <li>
                Edit{' '}
                <code className="bg-rb-fg text-rb-bg px-[6px] py-[2px]" style={{ fontFamily: 'var(--font-mono)' }}>backend/.env</code>
              </li>
              <li>
                Run:{' '}
                <code className="bg-rb-fg text-rb-bg px-[6px] py-[2px]" style={{ fontFamily: 'var(--font-mono)' }}>
                  docker compose up -d --force-recreate backend
                </code>
              </li>
              <li>Reload this page.</li>
            </ol>
            <div className="flex items-start gap-[8px] border-[3px] border-rb-warning bg-rb-bg p-sp-2">
              <Icon path={mdiAlert} size={18} className="text-rb-warning shrink-0 mt-[2px]" />
              <p className="text-[12px]">
                <code className="bg-rb-fg text-rb-bg px-[4px]" style={{ fontFamily: 'var(--font-mono)' }}>docker compose restart</code>
                {' '}does NOT re-read env_file. Always use{' '}
                <code className="bg-rb-fg text-rb-bg px-[4px]" style={{ fontFamily: 'var(--font-mono)' }}>--force-recreate</code>.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Scan Defaults ─────────────────────────────────────────────── */}
      <section>
        <h3
          className="text-[24px] uppercase mb-sp-2 leading-none"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          SCAN DEFAULTS
        </h3>
        <p className="text-[12px] uppercase tracking-[1px] text-rb-fg/60 mb-sp-3">
          DEFAULT SUBREDDITS FOR NEW SCANS
        </p>
        <div className="border-[3px] border-rb-fg bg-rb-bg p-sp-4">
          <SubredditsEditor configs={configs} onSaved={load} />
        </div>
      </section>
    </div>
  )
}
