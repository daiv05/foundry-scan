'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { mdiRocketLaunchOutline, mdiReddit, mdiNewspaperVariantOutline, mdiTrendingUp, mdiCart } from '@mdi/js'
import { api } from '@/lib/api'
import Icon from '@/components/ui/Icon'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const ALL_SOURCES = [
  { id: 'reddit',       label: 'REDDIT',        desc: 'r/SaaS, r/entrepreneur, r/startups, r/nocode', icon: mdiReddit },
  { id: 'hackernews',   label: 'HACKER NEWS',   desc: 'Ask HN, Show HN, top stories',                 icon: mdiNewspaperVariantOutline },
  { id: 'trends',       label: 'GOOGLE TRENDS', desc: 'Interest over time + rising queries',          icon: mdiTrendingUp },
  { id: 'producthunt',  label: 'PRODUCT HUNT',  desc: 'Competition & saturation data',                icon: mdiCart },
]

const DEFAULT_SUBREDDITS = ['SaaS', 'Entrepreneur', 'smallbusiness', 'freelance', 'webdev']

export default function NewScanPage() {
  const router = useRouter()
  const [sources, setSources]       = useState<string[]>(['reddit', 'hackernews', 'trends', 'producthunt'])
  const [keywords, setKeywords]     = useState('')
  const [subreddits, setSubreddits] = useState<string[]>(DEFAULT_SUBREDDITS)
  const [launching, setLaunching]   = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    api.getConfigs().then(configs => {
      const def = configs.find(c => c.is_default)
      if (def?.config?.subreddits && Array.isArray(def.config.subreddits)) {
        setSubreddits(def.config.subreddits as string[])
      }
    }).catch(() => { /* fallback */ })
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
      const config: Record<string, unknown> = { sources, subreddits }
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
    <div className="p-sp-5 max-w-[760px] mx-auto">
      <div className="border-b-[3px] border-rb-fg pb-sp-4 mb-sp-5">
        <h1 className="text-[64px] leading-none">NEW SCAN</h1>
        <p className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mt-[8px]">
          Configure data sources and launch the collection pipeline.
        </p>
      </div>

      {/* Data Sources */}
      <section className="mb-sp-5">
        <h3
          className="text-[24px] uppercase mb-sp-3 leading-none"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          DATA SOURCES
        </h3>
        <div className="space-y-[12px]">
          {ALL_SOURCES.map(src => {
            const active = sources.includes(src.id)
            return (
              <label
                key={src.id}
                className={
                  `flex items-center gap-sp-3 border-[3px] border-rb-fg px-sp-3 py-sp-3 cursor-pointer ` +
                  `${active ? 'bg-rb-fg text-rb-bg' : 'bg-rb-bg text-rb-fg hover:bg-rb-sunken'}`
                }
              >
                <Checkbox checked={active} onChange={() => toggle(src.id)} />
                <Icon path={src.icon} size={24} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[16px] leading-none"
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {src.label}
                  </p>
                  <p className={`text-[12px] mt-[4px] ${active ? 'text-rb-bg/70' : 'text-rb-fg/60'}`}>
                    {src.desc}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* Subreddits */}
      {sources.includes('reddit') && (
        <section className="mb-sp-5">
          <h3
            className="text-[24px] uppercase mb-sp-3 leading-none"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            SUBREDDITS
          </h3>
          <div className="flex flex-wrap gap-[8px] border-[3px] border-rb-fg bg-rb-sunken p-sp-3">
            {subreddits.map(sr => (
              <span
                key={sr}
                className="inline-flex items-center bg-rb-bg border-[2px] border-rb-fg px-[10px] py-[4px] text-[12px] uppercase tracking-[1px] font-semibold"
              >
                R/{sr}
              </span>
            ))}
          </div>
          <p className="text-[12px] mt-[8px] text-rb-fg/60">
            Defaults from <Link href="/settings" className="text-rb-link underline">Settings</Link>. Customise them there.
          </p>
        </section>
      )}

      {/* Keywords */}
      <section className="mb-sp-5">
        <Input
          label="KEYWORDS (OPTIONAL)"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="saas, automation, no-code, workflow"
          helper="Comma-separated. Applied to Google Trends and Product Hunt analysis."
        />
      </section>

      {error && (
        <div className="mb-sp-3 border-[3px] border-rb-error bg-rb-bg text-rb-error px-sp-3 py-sp-2 text-[14px]">
          {error}
        </div>
      )}

      <Button
        onClick={launch}
        disabled={launching || !sources.length}
        size="lg"
        className="w-full"
      >
        <Icon path={mdiRocketLaunchOutline} size={20} />
        {launching ? 'LAUNCHING…' : 'LAUNCH SCAN'}
      </Button>
    </div>
  )
}
