import Link from 'next/link'
import { mdiArrowLeft } from '@mdi/js'
import Icon from '@/components/ui/Icon'

/**
 * Rendered when notFound() is called or a route segment is missing.
 */
export default function NotFound() {
  return (
    <div className="p-sp-5 max-w-[640px] mx-auto">
      <div className="border-[5px] border-rb-fg bg-rb-bg p-sp-5">
        <p
          className="text-[96px] leading-none text-rb-fg/15 select-none mb-[0]"
          style={{ fontFamily: 'var(--font-headline)' }}
          aria-hidden="true"
        >
          404
        </p>
        <h1
          className="text-[40px] leading-none uppercase mb-sp-2 -mt-[8px]"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          PAGE NOT FOUND
        </h1>
        <p className="text-[14px] uppercase tracking-[1px] text-rb-fg/60 mb-sp-5">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-[8px] bg-rb-fg text-rb-bg border-[3px] border-rb-fg px-sp-3 py-[10px] uppercase text-[14px] tracking-[2px] font-semibold hover:bg-rb-bg hover:text-rb-fg"
        >
          <Icon path={mdiArrowLeft} size={16} /> BACK TO DASHBOARD
        </Link>
      </div>
    </div>
  )
}
