"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Pill from "./Pill";
import EmptyState from "./EmptyState";
import { money2, fdate } from "@/lib/money";
import { setQuoteStatus, deleteQuote, emailQuote } from "@/app/(app)/quotes/actions";

export type QuoteRow = {
  id: string; number: string; project: string | null; total: number;
  status: string; created_at: string; sent_at: string | null;
  approved_at: string | null;
  client: { name: string | null; company: string | null; email: string | null } | null;
};

export default function QuoteTable({ rows }: { rows: QuoteRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const shown = rows.filter((r) => !filter || r.status === filter);

  function run(id: string, fn: () => Promise<{ error?: string; ok?: boolean; jobNumber?: string | null; to?: string }>) {
    setBusyId(id);
    setNote(null);
    startTransition(async () => {
      const res = await fn();
      setBusyId(null);
      if (res?.error) { setNote({ tone: "bad", text: res.error }); return; }
      if (res?.jobNumber) setNote({ tone: "ok", text: `Approved — job ${res.jobNumber} opened on the Jobs tab.` });
      else if (res?.to) setNote({ tone: "ok", text: `Quote emailed to ${res.to}.` });
      router.refresh();
    });
  }

  return (
    <section className="panel">
      <h2 className="phead">
        Quote register
        <select className="field ml-auto w-auto px-2 py-1 text-xs"
          value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
        </select>
      </h2>

      {note && (
        <p className={`border-l-2 px-3.5 py-2 text-sm ${
          note.tone === "ok" ? "border-good bg-good-soft text-good" : "border-risk bg-risk-soft text-risk"
        }`}>{note.text}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="th">Quote</th><th className="th">Client</th>
              <th className="th">Created</th><th className="th">Sent</th><th className="th">Approved</th>
              <th className="th text-right">Total</th><th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((q) => (
              <tr key={q.id} className="hover:bg-surface-2">
                <td className="td">
                  <div className="font-mono font-semibold">{q.number}</div>
                  {q.project && <div className="text-xs text-ink-3">{q.project}</div>}
                </td>
                <td className="td">
                  <div className="font-semibold">{q.client?.company || q.client?.name || "—"}</div>
                  <div className="text-xs text-ink-3">{q.client?.name}</div>
                </td>
                <td className="td text-xs text-ink-3">{fdate(q.created_at)}</td>
                <td className="td text-xs text-ink-3">{fdate(q.sent_at)}</td>
                <td className="td text-xs text-ink-3">{fdate(q.approved_at)}</td>
                <td className="td num">{money2(Number(q.total))}</td>
                <td className="td"><Pill tone={q.status}>{q.status}</Pill></td>
                <td className="td">
                  <div className="flex flex-nowrap justify-end gap-1.5 whitespace-nowrap">
                    {q.status === "draft" && (
                      <button className="btn-ghost btn-sm" disabled={pending}
                        onClick={() => run(q.id, () => setQuoteStatus(q.id, "sent"))}>
                        Mark sent
                      </button>
                    )}
                    {q.status === "sent" && (
                      <>
                        <button className="btn-ghost btn-sm" disabled={pending}
                          onClick={() => run(q.id, () => setQuoteStatus(q.id, "approved"))}>
                          Approved
                        </button>
                        <button className="btn-ghost btn-sm" disabled={pending}
                          onClick={() => run(q.id, () => setQuoteStatus(q.id, "declined"))}>
                          Declined
                        </button>
                      </>
                    )}
                    {q.client?.email && (
                      <button className="btn-ghost btn-sm" disabled={pending}
                        onClick={() => run(q.id, () => emailQuote(q.id))}>
                        {busyId === q.id && pending ? "Sending…" : "Email"}
                      </button>
                    )}
                    <Link className="btn-ghost btn-sm" href={`/quotes/new?edit=${q.id}`}>Open</Link>
                    <a className="btn-ghost btn-sm" href={`/api/quotes/${q.id}/pdf`}>PDF</a>
                    <button className="btn-danger" disabled={pending}
                      onClick={() => {
                        if (confirm(`Delete quote ${q.number}? This cannot be undone.`))
                          run(q.id, () => deleteQuote(q.id));
                      }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!shown.length && (
        <EmptyState title={rows.length ? "Nothing in that status" : "No quotes yet"}>
          {rows.length
            ? "Change the filter to see the rest."
            : "Build one on the New Quote tab and save it — it lands here with a timestamp."}
        </EmptyState>
      )}
    </section>
  );
}
