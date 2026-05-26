import type { Scoring } from '@/lib/types'

const CRITERIA: { key: keyof Scoring; label: string; weight: number }[] = [
  { key: 'pain_intensity',  label: 'Pain',        weight: 30 },
  { key: 'trend_momentum',  label: 'Trend',       weight: 20 },
  { key: 'competition_gap', label: 'Competition', weight: 25 },
  { key: 'mvp_feasibility', label: 'MVP fit',     weight: 25 },
]

function barColor(value: number): string {
  if (value >= 8) return 'bg-green-500'
  if (value >= 5) return 'bg-yellow-500'
  return 'bg-red-500'
}

export default function ScoreBar({ scoring, totalScore }: { scoring: Scoring; totalScore: number }) {
  return (
    <div className="space-y-2">
      {CRITERIA.map(({ key, label, weight }) => {
        const value = scoring[key]
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm text-gray-400">
              {label} <span className="text-gray-600 text-xs">({weight}%)</span>
            </span>
            <div className="flex-1 rounded-full bg-gray-800 h-2">
              <div
                className={`h-2 rounded-full transition-all ${barColor(value)}`}
                style={{ width: `${value * 10}%` }}
              />
            </div>
            <span className="w-6 text-right text-sm font-semibold tabular-nums text-gray-300">
              {value}
            </span>
          </div>
        )
      })}
      <div className="flex items-center gap-3 border-t border-gray-800 pt-2 mt-1">
        <span className="w-28 shrink-0 text-sm font-semibold text-gray-300">Total</span>
        <div className="flex-1 rounded-full bg-gray-800 h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${barColor(totalScore)}`}
            style={{ width: `${totalScore * 10}%` }}
          />
        </div>
        <span className="w-6 text-right text-sm font-bold tabular-nums text-white">
          {totalScore.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
