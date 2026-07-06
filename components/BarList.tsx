/** Single-measure magnitude bars: one hue, thin, rounded ends, directly labelled. */
export default function BarList({
  items,
  emptyLabel = "No data yet.",
}: {
  items: { label: string; value: number; sub?: string }[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-mute">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="space-y-3.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold text-navy-900">{i.label}</span>
            <span className="flex-none font-display text-sm font-semibold tabular-nums text-navy-900">{i.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-navy-700"
              style={{ width: `${Math.max(3, (i.value / max) * 100)}%` }}
            />
          </div>
          {i.sub && <span className="mt-0.5 block truncate text-xs text-ink-mute">{i.sub}</span>}
        </li>
      ))}
    </ul>
  );
}
