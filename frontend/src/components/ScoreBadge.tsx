export function scoreColor(score: number): string {
  if (score >= 8) return 'bg-green-900 text-green-300'
  if (score >= 5) return 'bg-yellow-900 text-yellow-300'
  return 'bg-red-900 text-red-300'
}

export default function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${scoreColor(score)}`}>
      {score.toFixed(1)}
    </span>
  )
}
