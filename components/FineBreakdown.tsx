import { explainFine, type FineContext } from "@/lib/fines";

/**
 * Why a charge exists and how the amount was reached — the book, the dates, and
 * the arithmetic. Shown wherever a fine is listed, so nobody has to work it out
 * from a bare "Rs 20 · late".
 */
export default function FineBreakdown({
  fine,
  className = "",
}: {
  fine: FineContext;
  className?: string;
}) {
  const x = explainFine(fine);

  return (
    <div className={className}>
      <p className="text-xs text-ink-soft">{x.headline}</p>

      {x.timeline.length > 0 && (
        <ol className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {x.timeline.map((step, i) => (
            <li key={step.label} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-ink-mute/50" aria-hidden="true">
                  →
                </span>
              )}
              <span className="rounded-md bg-mist px-1.5 py-0.5 text-[0.65rem] text-ink-soft">
                <span className="font-mono uppercase tracking-[0.08em] text-ink-mute">{step.label}</span>{" "}
                <span className="font-semibold text-navy-900">{step.value}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {x.formula && (
        <p className="mt-1.5 font-mono text-[0.68rem] font-semibold text-gold-700">{x.formula}</p>
      )}

      {x.note && <p className="mt-1 text-[0.68rem] italic text-ink-mute">&ldquo;{x.note}&rdquo;</p>}
    </div>
  );
}
