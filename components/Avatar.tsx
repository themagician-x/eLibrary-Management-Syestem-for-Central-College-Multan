export function initials(name: string) {
  return (
    name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"
  );
}

export default function Avatar({
  name,
  src,
  size = 44,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className="flex-none rounded-full object-cover" />;
  }
  return (
    <span
      style={style}
      className="flex flex-none items-center justify-center rounded-full bg-navy-900 font-display font-semibold text-gold-400"
    >
      {initials(name)}
    </span>
  );
}
