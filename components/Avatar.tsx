export function initials(name: string) {
  return (
    name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"
  );
}

/** Initials disc. Student records carry no photograph — see migration 0011. */
export default function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className="flex flex-none items-center justify-center rounded-full bg-navy-900 font-display font-semibold text-gold-400"
    >
      {initials(name)}
    </span>
  );
}
