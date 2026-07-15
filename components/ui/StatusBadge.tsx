const STATUS_CONFIG: Record<string, { label: string; dot: string; className: string }> = {
  published:   { label: 'In cerca di fornitore', dot: '🟡', className: 'bg-yellow-100 text-yellow-800' },
  matched:     { label: 'Fornitori notificati',  dot: '🟠', className: 'bg-orange-100 text-orange-800' },
  confirmed:   { label: 'Confermata',            dot: '🔵', className: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In corso',              dot: '🟢', className: 'bg-green-100 text-green-800' },
  completed:   { label: 'Completata',            dot: '✅', className: 'bg-green-100 text-green-800' },
  reviewed:    { label: 'Valutata',              dot: '⭐', className: 'bg-gray-100 text-gray-600' },
  cancelled:   { label: 'Cancellata',            dot: '❌', className: 'bg-red-100 text-red-600' },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: '⚪', className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`badge ${cfg.className}`}>
      {cfg.dot} {cfg.label}
    </span>
  )
}
