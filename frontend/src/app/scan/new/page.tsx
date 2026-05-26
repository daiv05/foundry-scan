'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const ALL_SOURCES = [
  { id: 'reddit',       label: 'Reddit',        desc: 'r/SaaS, r/entrepreneur, r/startups, r/nocode' },
  { id: 'hackernews',   label: 'Hacker News',   desc: 'Ask HN, Show HN, top stories' },
  { id: 'trends',       label: 'Google Trends', desc: 'Interest over time + rising queries' },
  { id: 'producthunt',  label: 'Product Hunt',  desc: 'Competition & saturation data' },
]

const DEFAULT_SUBREDDITS = ['SaaS', 'Entrepreneur', 'smallbusiness', 'freelance', 'webdev']

export default function NewScanPage() {
  const router = useRouter()
  const [sources, setSources]         = useState<string[]>(['reddit', 'hackernews', 'trends', 'producthunt'])
  const [keywords, setKeywords]       = useState('')
  const [subreddits, setSubreddits]   = useState<string[]>(DEFAULT_SUBREDDITS)
  const [launching, setLaunching]     = useState(false)
  const [error, setError]             = useState('')

  // Load default subreddits from saved config
  useEffect(() => {
    api.getConfigs().then(configs => {
      const def = configs.find(c => c.is_default)
      if (def?.config?.subreddits && Array.isArray(def.config.subreddits)) {
        setSubreddits(def.config.subreddits as string[])
      }
    }).catch(() => { /* use hardcoded fallback silently */ })
  }, [])

  function toggle(id: string) {
    setSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  async function launch() {
    if (!sources.length) return setError('Select at least one source.')
    setLaunching(true)
    setError('')
    try {
      const config: Record<string, unknown> = {
        sources,
        subreddits,
      }
      if (keywords.trim()) {
        const kws = keywords.split(',').map(k => k.trim()).filter(Boolean)
        if (kws.length) {
          config.trends_keywords = kws
          config.ph_keywords = kws
        }
      }
      const scan = await api.createScan(config)
      router.push(`/scan/${scan.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create scan')
      setLaunching(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">New Scan</h1>
      <p className="text-sm text-gray-400 mb-8">
        Configure data sources and launch the collection pipeline.
      </p>

      {/* Data Sources */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Data Sources
        </h2>
        <div className="space-y-2">
          {ALL_SOURCES.map(src => (
            <label
              key={src.id}
              className={`flex items-start gap-4 rounded-xl border px-5 py-4 cursor-pointer transition-colors ${
                sources.includes(src.id)
                  ? 'border-blue-600 bg-blue-950/30'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={sources.includes(src.id)}
                onChange={() => toggle(src.id)}
                className="mt-0.5 accent-blue-500"
              />
              <div>
                <p className="font-medium text-white text-sm">{src.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{src.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Subreddits (shown only when Reddit is selected) */}
      {sources.includes('reddit') && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Subreddits
          </h2>
          <div className="flex flex-wrap gap-2 rounded-xl border border-gray-800 bg-gray-900 p-4">
            {subreddits.map(sr => (
              <span
                key={sr}
                className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-200"
              >
                r/{sr}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Defaults from{' '}
            <a href="/settings" className="text-blue-400 hover:underline">Settings</a>.
            {' '}You can customise them there.
          </p>
        </section>
      )}

      {/* Keywords */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Keywords <span className="normal-case font-normal text-gray-600">(optional)</span>
        </h2>
        <input
          type="text"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="saas, automation, no-code, workflow"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <p className="text-xs text-gray-500 mt-2">
          Comma-separated. Applied to Google Trends and Product Hunt analysis.
        </p>
      </section>

      {error && (
        <p className="text-sm text-red-400 mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3">
          {error}
        </p>
      )}

      <button
        onClick={launch}
        disabled={launching || !sources.length}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
      >
        {launching ? 'Launching…' : '🚀 Launch Scan'}
      </button>
    </div>
  )
}
