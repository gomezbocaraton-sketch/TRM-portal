const TONE: Record<string, string> = {
  draft:     "bg-surface-3 text-ink-2",
  sent:      "bg-navy-soft text-navy",
  approved:  "bg-good-soft text-good",
  declined:  "bg-risk-soft text-risk",
  active:    "bg-navy-soft text-navy",
  hold:      "bg-orange-soft text-orange-deep",
  complete:  "bg-good-soft text-good",
  received:  "bg-good-soft text-good",
  pending:   "bg-surface-3 text-ink-2",
  overdue:   "bg-risk-soft text-risk",
  paid:      "bg-good-soft text-good",
};

export default function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`pill ${TONE[tone] || TONE.pending}`}>{children}</span>;
}
