'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { mdiAlertOctagon, mdiRefresh } from '@mdi/js'
import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'

export default function OpportunityError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[OpportunityError]', error)
  }, [error])

  return (
    <div className="p-sp-5 max-w-[640px] mx-auto">
      <Link
        href="/opportunities"
        className="text-[12px] uppercase tracking-[1px] underline hover:text-rb-link mb-sp-4 inline-block"
      >
        ← Opportunities
      </Link>

      <div className="border-[5px] border-rb-error bg-rb-bg p-sp-4">
        <div className="flex items-center gap-[8px] mb-sp-2">
          <Icon path={mdiAlertOctagon} size={24} className="text-rb-error shrink-0" />
          <p
            className="text-[24px] uppercase text-rb-error leading-none"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            ERROR LOADING OPPORTUNITY
          </p>
        </div>
        <p
          className="text-[13px] bg-rb-sunken border-[2px] border-rb-fg p-sp-2 break-words mb-sp-3"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex items-center gap-sp-3 flex-wrap">
          <Button onClick={reset} variant="secondary" size="md">
            <Icon path={mdiRefresh} size={14} /> RETRY
          </Button>
          <Link
            href="/opportunities"
            className="text-[13px] uppercase tracking-[1px] underline hover:text-rb-link"
          >
            Back to opportunities -->
          </Link>
        </div>
      </div>
    </div>
  )
}
