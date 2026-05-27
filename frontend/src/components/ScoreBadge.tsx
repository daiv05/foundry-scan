/**
 * ScoreBadge - RawBlock style. Square, 3px border, color per range (semaphore).
 * Green ≥8, Orange ≥5, Red <5. Background is theme-aware.
 */

export function scoreColor(score: number): { border: string; text: string } {
  if (score >= 8) return { border: 'border-rb-success', text: 'text-rb-success' }
  if (score >= 5) return { border: 'border-rb-warning', text: 'text-rb-warning' }
  return { border: 'border-rb-error', text: 'text-rb-error' }
}

export default function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const { border, text } = scoreColor(score)
  const sizing = size === 'md'
    ? 'px-[14px] py-[6px] text-[18px]'
    : 'px-[10px] py-[2px] text-[14px]'
  return (
    <span
      className={`inline-block bg-rb-bg border-[3px] ${border} ${text} ${sizing} font-bold tabular-nums`}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {score.toFixed(1)}
    </span>
  )
}
