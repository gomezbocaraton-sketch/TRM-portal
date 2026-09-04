export default function StatStrip(
  { items }: { items: { label: string; value: string; tone?: "risk" | "good" }[] }
) {
  return (
    <dl className="mb-5 grid border border-rule border-t-2 border-t-orange bg-surface
                   [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
      {items.map((s) => (
        <div key={s.label} className="border-r border-rule px-4 py-3 last:border-r-0">
          <dt className="mb-1.5 font-mono text-[.64rem] uppercase tracking-[.09em] text-ink-3">
            {s.label}
          </dt>
          <dd className={`m-0 font-display text-2xl font-bold leading-none tabular-nums ${
            s.tone === "risk" ? "text-risk" : s.tone === "good" ? "text-good" : "text-navy"
          }`}>
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
