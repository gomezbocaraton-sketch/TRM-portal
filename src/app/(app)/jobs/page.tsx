import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatStrip from "@/components/StatStrip";
import EmptyState from "@/components/EmptyState";
import Pill from "@/components/Pill";
import { money } from "@/lib/money";
import { STAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select(`id, number, project, contract_value, status, started_at,
             client:clients(name, company),
             work:job_work_items(stage),
             payments:job_payments(amount, paid_date, due_date),
             documents:job_documents(status)`)
    .order("started_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const rows = (jobs || []).map((j) => {
    const client = Array.isArray(j.client) ? j.client[0] : j.client;
    const work = j.work || [];
    const progress = work.length
      ? work.reduce((a, w) => a + (STAGES.find((s) => s.value === w.stage)?.weight ?? 0), 0) / work.length
      : 0;
    const pays = j.payments || [];
    const paid = pays.filter((p) => p.paid_date).reduce((a, p) => a + Number(p.amount), 0);
    const overdue = pays.filter((p) => !p.paid_date && p.due_date && p.due_date < today)
      .reduce((a, p) => a + Number(p.amount), 0);
    const pending = pays.filter((p) => !p.paid_date).reduce((a, p) => a + Number(p.amount), 0);
    const docs = j.documents || [];
    return {
      id: j.id, number: j.number, project: j.project, status: j.status,
      value: Number(j.contract_value), client, progress, paid, overdue, pending,
      done: work.filter((w) => w.stage === "done").length, items: work.length,
      docsIn: docs.filter((d) => d.status === "received").length,
      docsPending: docs.filter((d) => d.status === "pending").length,
    };
  });

  const totalValue = rows.reduce((a, j) => a + j.value, 0);
  const totalPaid = rows.reduce((a, j) => a + j.paid, 0);
  const totalOverdue = rows.reduce((a, j) => a + j.overdue, 0);
  const docsAwaited = rows.reduce((a, j) => a + j.docsPending, 0);

  return (
    <>
      <StatStrip items={[
        { label: "Active jobs", value: String(rows.filter((j) => j.status === "active").length) },
        { label: "Contract value", value: money(totalValue) },
        { label: "Collected", value: money(totalPaid), tone: "good" },
        { label: "Outstanding", value: money(totalValue - totalPaid) },
        { label: "Overdue", value: money(totalOverdue), tone: totalOverdue > 0 ? "risk" : undefined },
        { label: "Docs awaited", value: String(docsAwaited) },
      ]} />

      {rows.length ? (
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
          {rows.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`}
              className={`flex flex-col gap-2.5 border border-rule bg-surface p-4 shadow-sm transition
                          hover:border-rule-strong border-t-[3px] ${
                            j.status === "complete" ? "border-t-good"
                            : j.status === "hold" ? "border-t-orange" : "border-t-navy"}`}>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-xs text-ink-3">{j.number}</span>
                <h3 className="min-w-0 flex-1 truncate font-display text-base text-navy">
                  {j.client?.company || j.client?.name || "—"}
                </h3>
                <Pill tone={j.status}>{j.status === "hold" ? "on hold" : j.status}</Pill>
              </div>
              {j.project && <p className="text-sm text-ink-2">{j.project}</p>}

              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <i className="block h-full rounded-full bg-navy" style={{ width: `${Math.round(j.progress * 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[.7rem] text-ink-3">
                  <span>work {Math.round(j.progress * 100)}%</span>
                  <span>{j.done} / {j.items} items</span>
                </div>
              </div>

              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <i className="block h-full rounded-full bg-good"
                    style={{ width: `${j.value ? Math.round((j.paid / j.value) * 100) : 0}%` }} />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[.7rem] text-ink-3">
                  <span>collected {money(j.paid)}</span>
                  <span className={j.overdue > 0 ? "text-risk" : ""}>
                    {j.overdue > 0 ? `${money(j.overdue)} overdue` : `${money(j.pending)} pending`}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 font-mono text-xs tabular-nums">
                {[
                  { k: "Contract", v: money(j.value), tone: "" },
                  { k: "Docs in", v: String(j.docsIn), tone: "" },
                  { k: "Awaiting", v: String(j.docsPending), tone: j.docsPending ? "text-orange-deep" : "" },
                ].map((f) => (
                  <div key={f.k}>
                    <span className="block text-[.66rem] uppercase tracking-[.07em] text-ink-3">{f.k}</span>
                    <b className={`block font-display text-base ${f.tone || "text-ink"}`}>{f.v}</b>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState title="No live jobs yet">
            Mark a quote approved on the Quotes tab and it becomes a job here — with its work items,
            payment schedule and document register already built from the lines the client agreed to.
          </EmptyState>
        </div>
      )}
    </>
  );
}
