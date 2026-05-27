import type { Metadata, Viewport } from 'next'
import { Archivo_Black, Work_Sans, Space_Mono } from 'next/font/google'
import './globals.css'
import Shell from '@/components/Shell'

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-headline',
})

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'FoundryScan',
  description: 'Micro-SaaS opportunity discovery platform',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

// Runs before React hydration - avoids flash of wrong theme.
const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem('rb-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivoBlack.variable} ${workSans.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-rb-bg text-rb-fg antialiased">
        <Shell>
          {children}
        </Shell>
      </body>
    </html>
  )
}
