import type { ScanStatus } from '@/lib/types'

const CONFIG: Record<ScanStatus, { label: string; className: string }> = {
  pending:             { label: 'Pending',           className: 'bg-gray-700 text-gray-300' },
  collecting:          { label: 'Collecting',        className: 'bg-blue-900 text-blue-300 animate-pulse' },
  processing:          { label: 'Processing',        className: 'bg-indigo-900 text-indigo-300 animate-pulse' },
  awaiting_llm_input:  { label: 'Needs LLM input',  className: 'bg-yellow-900 text-yellow-300' },
  parsing:             { label: 'Parsing',           className: 'bg-purple-900 text-purple-300 animate-pulse' },
  completed:           { label: 'Completed',         className: 'bg-green-900 text-green-300' },
  failed:              { label: 'Failed',            className: 'bg-red-900 text-red-300' },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as ScanStatus] ?? { label: status, className: 'bg-gray-700 text-gray-300' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
