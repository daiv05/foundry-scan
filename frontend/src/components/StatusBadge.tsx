import type { ScanStatus } from '@/lib/types'
import { StatusChip } from './ui/Chip'

type Kind = 'active' | 'warning' | 'error' | 'default'

const CONFIG: Record<ScanStatus, { label: string; kind: Kind }> = {
  pending:            { label: 'Pending',     kind: 'default' },
  collecting:         { label: 'Collecting',  kind: 'warning' },
  processing:         { label: 'Processing',  kind: 'warning' },
  awaiting_llm_input: { label: 'Needs Input', kind: 'warning' },
  parsing:            { label: 'Parsing',     kind: 'warning' },
  completed:          { label: 'Completed',   kind: 'active' },
  failed:             { label: 'Failed',      kind: 'error' },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as ScanStatus] ?? { label: status, kind: 'default' as const }
  return <StatusChip kind={cfg.kind}>{cfg.label}</StatusChip>
}
