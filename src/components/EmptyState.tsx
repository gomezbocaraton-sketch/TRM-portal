export default function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-5 py-11 text-center text-ink-3">
      <p className="font-display text-base text-ink-2">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-md text-sm">{children}</p>}
    </div>
  );
}
