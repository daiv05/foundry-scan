import type { Scoring } from '@/lib/types'

const CRITERIA: { key: keyof Scoring; label: string; weight: number }[] = [
  { key: 'pain_intensity',  label: 'PAIN',        weight: 30 },
  { key: 'trend_momentum',  label: 'TREND',       weight: 20 },
  { key: 'competition_gap', label: 'COMPETITION', weight: 25 },
  { key: 'mvp_feasibility', label: 'MVP FIT',     weight: 25 },
]

function barFill(value: number): string {
  if (value >= 8) return 'bg-rb-success'
  if (value >= 5) return 'bg-rb-warning'
  return 'bg-rb-error'
}

export default function ScoreBar({ scoring, totalScore }: { scoring: Scoring; totalScore: number }) {
  return (
    <div className="space-y-[12px]">
      {CRITERIA.map(({ key, label, weight }) => {
        const value = scoring[key]
        return (
          <div key={key} className="flex items-center gap-[12px]">
            <span
              className="w-[140px] shrink-0 text-[11px] uppercase tracking-[1px] text-rb-fg"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {label}
              <span className="text-rb-fg/50 ml-[6px] font-normal">
                {weight}%
              </span>
            </span>
            <div className="flex-1 bg-rb-bg border-[2px] border-rb-fg h-[14px] relative">
              <div
                className={`absolute inset-y-0 left-0 ${barFill(value)}`}
                style={{ width: `${value * 10}%` }}
              />
            </div>
            <span
              className="w-[28px] text-right text-[14px] font-bold tabular-nums text-rb-fg"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {value}
            </span>
          </div>
        )
      })}
      <div className="flex items-center gap-[12px] border-t-[3px] border-rb-fg pt-[12px] mt-[8px]">
        <span
          className="w-[140px] shrink-0 text-[14px] uppercase tracking-[1px] text-rb-fg"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          TOTAL
        </span>
        <div className="flex-1 bg-rb-bg border-[3px] border-rb-fg h-[18px] relative">
          <div
            className={`absolute inset-y-0 left-0 ${barFill(totalScore)}`}
            style={{ width: `${totalScore * 10}%` }}
          />
        </div>
        <span
          className="w-[40px] text-right text-[18px] font-bold tabular-nums text-rb-fg"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {totalScore.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
