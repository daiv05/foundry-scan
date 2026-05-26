'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mdiViewDashboard, mdiTargetVariant, mdiPlus, mdiCog, mdiWeatherSunny, mdiWeatherNight } from '@mdi/js'
import Icon from './ui/Icon'
import { useTheme } from '@/lib/useTheme'

const LINKS = [
  { href: '/',              label: 'Dashboard',     icon: mdiViewDashboard },
  { href: '/opportunities', label: 'Opportunities', icon: mdiTargetVariant },
  { href: '/scan/new',      label: 'New Scan',      icon: mdiPlus },
  { href: '/settings',      label: 'Settings',      icon: mdiCog },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <aside className="flex flex-col w-[260px] shrink-0 border-r-[3px] border-rb-fg bg-rb-bg h-screen sticky top-0">
      {/* Brand */}
      <div className="border-b-[3px] border-rb-fg p-sp-4">
        <p className="leading-none" style={{ fontFamily: 'var(--font-headline)' }}>
          <span className="block text-[24px] text-rb-fg tracking-[1px]">FOUNDRY</span>
          <span className="block text-[20px] text-rb-fg/80 tracking-[3px]">SCAN</span>
        </p>
        <p className="text-[12px] text-rb-fg/60 uppercase tracking-[1px] mt-[6px]">
          Opportunity finder
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col">
        {LINKS.map(({ href, label, icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={
                `flex items-center gap-[12px] px-sp-4 py-[14px] ` +
                `border-b-[3px] border-rb-fg ` +
                `uppercase text-[14px] tracking-[1px] font-semibold ` +
                `${active
                  ? 'bg-rb-fg text-rb-bg'
                  : 'bg-rb-bg text-rb-fg hover:bg-rb-fg hover:text-rb-bg'}`
              }
            >
              <Icon path={icon} size={20} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Theme toggle */}
      <div className="mt-auto border-t-[3px] border-rb-fg">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between px-sp-4 py-[14px] uppercase text-[12px] tracking-[1px] font-semibold text-rb-fg bg-rb-bg hover:bg-rb-fg hover:text-rb-bg cursor-pointer"
          title="Toggle theme"
        >
          <span>{theme === 'dark' ? 'DARK MODE' : 'LIGHT MODE'}</span>
          <Icon path={theme === 'dark' ? mdiWeatherNight : mdiWeatherSunny} size={20} />
        </button>
      </div>
    </aside>
  )
}
