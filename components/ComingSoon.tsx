export default function ComingSoon({
  milestone,
  points,
}: {
  milestone: string;
  points: string[];
}) {
  return (
    <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-8 sm:p-10">
      <span className="inline-block rounded-full bg-gold-100 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-gold-700">
        Arrives in {milestone}
      </span>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
        This section isn&rsquo;t built yet — it&rsquo;s next up on the roadmap.
        When it lands, you&rsquo;ll be able to:
      </p>
      <ul className="mt-4 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-baseline gap-2.5 text-sm text-ink-soft">
            <span className="h-1.5 w-1.5 flex-none translate-y-[-1px] rounded-full bg-gold-500" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
