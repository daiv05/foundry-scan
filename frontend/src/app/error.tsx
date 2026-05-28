'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { mdiAlertOctagon, mdiRefresh } from '@mdi/js'
import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'

/**
 * Root-level React error boundary (Next.js App Router).
 * Catches unexpected runtime errors inside any page that doesn't have its
 * own segment-level error.tsx.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[RootError]', error)
  }, [error])

  return (
    <div className="p-sp-5 max-w-[640px] mx-auto">
      <div className="border-[5px] border-rb-error bg-rb-bg p-sp-5">
        <div className="flex items-center gap-[10px] mb-sp-3">
          <Icon path={mdiAlertOctagon} size={32} className="text-rb-error shrink-0" />
          <h2
            className="text-[32px] leading-none uppercase text-rb-error"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            SOMETHING WENT WRONG
          </h2>
        </div>

        <p
          className="text-[13px] bg-rb-sunken border-[2px] border-rb-fg p-sp-2 break-words mb-sp-4"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {error.message || 'An unexpected error occurred.'}
          {error.digest && (
            <span className="block mt-[4px] text-rb-fg/50">ref: {error.digest}</span>
          )}
        </p>

        <div className="flex items-center gap-sp-3 flex-wrap">
          <Button onClick={reset} size="md">
            <Icon path={mdiRefresh} size={16} /> TRY AGAIN
          </Button>
          <Link
            href="/"
            className="text-[13px] uppercase tracking-[1px] underline hover:text-rb-link"
          >
            Back to dashboard {'->'}
          </Link>
        </div>
      </div>
    </div>
  )
}
