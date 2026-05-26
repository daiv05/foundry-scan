'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',               label: 'Dashboard',      icon: '⌂' },
  { href: '/opportunities',  label: 'Opportunities',  icon: '◈' },
  { href: '/scan/new',       label: 'New Scan',       icon: '+' },
  { href: '/settings',       label: 'Settings',       icon: '⚙' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-gray-800 bg-gray-950 min-h-screen px-3 py-6">
      <div className="mb-8 px-3">
        <span className="text-lg font-bold tracking-tight text-white">AlcSaaS</span>
        <p className="text-xs text-gray-500 mt-0.5">Opportunity finder</p>
      </div>
      <nav className="flex flex-col gap-1">
        {LINKS.map(({ href, label, icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-gray-800 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <span className="w-4 text-center font-mono text-base leading-none">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
