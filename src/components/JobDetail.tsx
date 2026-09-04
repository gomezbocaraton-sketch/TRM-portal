"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Pill from "./Pill";
import EmptyState from "./EmptyState";
import { money, money2, fdate } from "@/lib/money";
import { STAGES } from "@/lib/constants";
import { docTypesFor } from "@/lib/doctypes";
import {
  setJobStatus, saveJobNotes, setWorkStage, markPaid, savePayment, deletePayment,
  buildChecklist, saveDocument, markDocReceived, deleteDocument, documentUrl,
} from "@/app/(app)/jobs/actions";

export type WorkItem = { id: string; name: string; category: string; qty: number; stage: string; updated_at: string | null };
export type Payment = { id: string; label: string; amount: number; due_date: string | null; paid_date: string | null };
export type JobDoc = {
  id: string; doc_type: string; label: string | null; category: string | null;
  status: string; received_at: string | null; from_party: string | null; notes: string | null;
  storage_path: string | null; file_name: string | null; file_size: number | null;
  external_link: string | null;
};
export type Job = {
  id: string; number: string; project: string | null; contract_value: number;
  status: string; notes: string | null; started_at: string; quote_id: string | null;
  client: { name: string | null; company: string | null; email: string | null; phone: string | null } | null;
};

const kb = (n: number | null) =>
  n == null ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export default function JobDetail({
  job, work, payments, documents,
}: { job: Job; work: WorkItem[]; payments: Payment[]; documents: JobDoc[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [notes, setNotes] = useState(job.notes ?? "");
  const [docOpen, setDocOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<JobDoc | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [editPay, setEditPay] = useState<Payment | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(work.map((w) => w.category))), [work]
  );
  const docTypes = useMemo(() => docTypesFor(categories), [categories]);

  const progress = work.length
    ? work.reduce((a, w) => a + (STAGES.find((s) => s.value === w.stage)?.weight ?? 0), 0) / work.length
    : 0;

  const today = new Date().toISOString().slice(0, 10);
  const paid = payments.filter((p) => p.paid_date).reduce((a, p) => a + Number(p.amount), 0);
  const overdue = payments.filter((p) => !p.paid_date && p.due_date && p.due_date < today)
    .reduce((a, p) => a + Number(p.amount), 0);
  const pendingAmt = payments.filter((p) => !p.paid_date).reduce((a, p) => a + Number(p.amount), 0);

  function run(fn: () => Promise<{ error?: string; ok?: boolean; added?: number; categories?: number; url?: string }>,
               onOk?: (r: { added?: number; categories?: number; url?: string }) => void) {
    setNote(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) { setNote({ tone: "bad", text: res.error }); return; }
      onOk?.(res ?? {});
      router.refresh();
    });
  }

  const sortedDocs = [...documents].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return (b.received_at || "").localeCompare(a.received_at || "");
  });

  return (
    <>
      <Link href="/jobs" className="mb-2 inline-block font-mono text-sm tracking-wide text-orange-deep hover:underline">
        ← All jobs
      </Link>

      <header className="mb-5 flex flex-wrap items-start gap-4 border-b-2 border-navy pb-3.5">
        <div className="min-w-[220px] flex-1">
          <h1 className="font-display text-2xl font-bold text-navy">
            {job.client?.company || job.client?.name || "—"}
            {job.project ? ` — ${job.project}` : ""}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            <span className="font-mono">{job.number}</span> · contract{" "}
            <b className="text-ink">{money2(Number(job.contract_value))}</b> · started {fdate(job.started_at)}
            <br />
            {job.client?.name}
            {job.client?.email && <> · <a className="text-orange-deep hover:underline" href={`mailto:${job.client.email}`}>{job.client.email}</a></>}
            {job.client?.phone && <> · {job.client.phone}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="field w-auto" value={job.status} disabled={pending}
            onChange={(e) => run(() => setJobStatus(job.id, e.target.value as "active" | "hold" | "complete"))}>
            <option value="active">Active</option>
            <option value="hold">On hold</option>
            <option value="complete">Complete</option>
          </select>
          {job.quote_id && (
            <a className="btn-ghost btn-sm" href={`/api/quotes/${job.quote_id}/pdf`}>Quote PDF</a>
          )}
        </div>
      </header>

      {note && (
        <p className={`mb-4 border-l-2 px-3.5 py-2 text-sm ${
          note.tone === "ok" ? "border-good bg-good-soft text-good" : "border-risk bg-risk-soft text-risk"
        }`}>{note.text}</p>
      )}

      <div className="grid items-start gap-4 xl:[grid-template-columns:minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ── left column ── */}
        <div className="flex flex-col gap-4">
          <section className="panel">
            <h2 className="phead">
              Work progress
              <span className="ml-auto font-mono">{Math.round(progress * 100)}% · {work.length} items</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] border-collapse text-sm">
                <thead>
                  <tr><th className="th">Item</th><th className="th w-[176px]">Stage</th><th className="th w-[150px]">Updated</th></tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <Fragment key={cat}>
                      <tr>
                        <td colSpan={3} className="border-b border-rule bg-surface-2 px-3 py-1.5
                                                   font-mono text-[.63rem] uppercase tracking-[.09em] text-navy">
                          {cat}
                        </td>
                      </tr>
                      {work.filter((w) => w.category === cat).map((w) => (
                        <tr key={w.id} className="hover:bg-surface-2">
                          <td className="td">
                            <span className="font-semibold">{w.name}</span>
                            {Number(w.qty) > 1 && <span className="ml-1.5 text-xs text-ink-3">×{w.qty}</span>}
                          </td>
                          <td className="td">
                            <select className="field px-1.5 py-1 text-xs" value={w.stage} disabled={pending}
                              onChange={(e) => run(() => setWorkStage(w.id, e.target.value, job.id))}>
                              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </td>
                          <td className="td text-xs text-ink-3">{w.updated_at ? fdate(w.updated_at) : "—"}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2 className="phead">
              Documents
              <span className="ml-auto flex gap-1.5">
                <button className="btn-ghost btn-sm" disabled={pending}
                  onClick={() => run(() => buildChecklist(job.id), (r) =>
                    setNote({ tone: "ok", text: r.added
                      ? `Added ${r.added} expected document${r.added === 1 ? "" : "s"} across ${r.categories} categor${r.categories === 1 ? "y" : "ies"}.`
                      : "Every expected document is already on the register." }))}>
                  Build checklist
                </button>
                <button className="btn-ghost btn-sm"
                  onClick={() => { setEditDoc(null); setDocOpen(true); }}>
                  + Add document
                </button>
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="th">Document</th><th className="th w-[24%]">Type</th>
                    <th className="th w-[118px]">Status</th><th className="th w-[150px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDocs.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-2">
                      <td className="td">
                        <div className="font-semibold">{d.label || d.doc_type}</div>
                        <div className="text-xs text-ink-3">
                          {d.from_party}
                          {d.file_name && (
                            <>{d.from_party ? " · " : ""}
                              <button className="text-orange-deep hover:underline"
                                onClick={() => run(() => documentUrl(d.id), (r) => { if (r.url) window.open(r.url, "_blank", "noopener"); })}>
                                {d.file_name}
                              </button>
                              <span className="ml-1">{kb(d.file_size)}</span>
                            </>
                          )}
                          {!d.file_name && d.external_link && (
                            <>{d.from_party ? " · " : ""}
                              <a className="text-orange-deep hover:underline" href={d.external_link} target="_blank" rel="noopener noreferrer">open link</a>
                            </>
                          )}
                          {d.notes && <><br />{d.notes}</>}
                        </div>
                      </td>
                      <td className="td text-xs text-ink-3">{d.doc_type}</td>
                      <td className="td">
                        <Pill tone={d.status}>{d.status}</Pill>
                        {d.received_at && <div className="text-xs text-ink-3">{fdate(d.received_at)}</div>}
                      </td>
                      <td className="td">
                        <div className="flex flex-nowrap justify-end gap-1.5">
                          {d.status === "pending" && (
                            <button className="btn-ghost btn-sm" disabled={pending}
                              onClick={() => run(() => markDocReceived(d.id, job.id))}>In</button>
                          )}
                          <button className="btn-ghost btn-sm"
                            onClick={() => { setEditDoc(d); setDocOpen(true); }}>Edit</button>
                          <button className="btn-danger" disabled={pending}
                            onClick={() => { if (confirm(`Remove “${d.label || d.doc_type}” from the register?`)) run(() => deleteDocument(d.id, job.id)); }}>×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!documents.length && (
              <EmptyState title="No documents logged">
                Build a checklist from the categories on this job, or add one as it arrives.
              </EmptyState>
            )}
          </section>
        </div>

        {/* ── right column ── */}
        <div className="flex flex-col gap-4">
          <section className="panel">
            <h2 className="phead">
              Payments
              <button className="btn-ghost btn-sm ml-auto"
                onClick={() => { setEditPay(null); setPayOpen(true); }}>+ Add</button>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="th">Stage</th><th className="th text-right">Amount</th>
                    <th className="th w-[104px]">Due</th><th className="th w-[100px]">Status</th>
                    <th className="th w-[112px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const st = p.paid_date ? "paid" : (p.due_date && p.due_date < today ? "overdue" : "pending");
                    return (
                      <tr key={p.id} className="hover:bg-surface-2">
                        <td className="td font-semibold">{p.label}</td>
                        <td className="td num">{money2(Number(p.amount))}</td>
                        <td className="td text-xs text-ink-3">{p.due_date ? fdate(p.due_date) : "—"}</td>
                        <td className="td">
                          <Pill tone={st}>{st}</Pill>
                          {p.paid_date && <div className="text-xs text-ink-3">{fdate(p.paid_date)}</div>}
                        </td>
                        <td className="td">
                          <div className="flex flex-nowrap justify-end gap-1.5">
                            {!p.paid_date && (
                              <button className="btn-ghost btn-sm" disabled={pending}
                                onClick={() => run(() => markPaid(p.id, job.id))}>Paid</button>
                            )}
                            <button className="btn-ghost btn-sm"
                              onClick={() => { setEditPay(p); setPayOpen(true); }}>Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <dl className="grid grid-cols-3 border-t border-rule">
              {[
                { k: "Paid", v: money(paid), c: "text-good" },
                { k: "Pending", v: money(pendingAmt - overdue), c: "text-ink" },
                { k: "Overdue", v: money(overdue), c: "text-risk" },
              ].map((s) => (
                <div key={s.k} className="border-r border-rule px-3.5 py-2.5 last:border-r-0">
                  <dt className="mb-1 font-mono text-[.62rem] uppercase tracking-[.08em] text-ink-3">{s.k}</dt>
                  <dd className={`m-0 font-display text-lg font-bold tabular-nums ${s.c}`}>{s.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel">
            <h2 className="phead">Job notes</h2>
            <div className="p-3.5">
              <textarea className="field min-h-[110px]" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Filing numbers, DOB job numbers, examiner comments, site contacts…" />
              <button className="btn-ghost btn-sm mt-2.5" disabled={pending}
                onClick={() => run(() => saveJobNotes(job.id, notes), () => setNote({ tone: "ok", text: "Notes saved." }))}>
                Save notes
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ── document modal ── */}
      {docOpen && (
        <Modal title={editDoc ? "Edit document" : "Add document"} onClose={() => setDocOpen(false)}>
          <form action={(fd) => {
            fd.set("job_id", job.id);
            if (editDoc) fd.set("doc_id", editDoc.id);
            run(() => saveDocument(fd), () => { setDocOpen(false); setNote({ tone: "ok", text: "Document saved." }); });
          }}>
            <div className="p-4">
              <label className="mb-1 block">
                <span className="lbl">Document type</span>
                <select name="doc_type" className="field" defaultValue={editDoc?.doc_type || docTypes[0]}>
                  {(editDoc && !docTypes.includes(editDoc.doc_type)
                    ? [editDoc.doc_type, ...docTypes] : docTypes).map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <p className="mb-3 text-xs text-ink-3">
                Types come from the work categories on this job&rsquo;s quote, plus the standard set.
              </p>

              <label className="mb-3 block">
                <span className="lbl">Label / reference</span>
                <input name="label" className="field" defaultValue={editDoc?.label || ""}
                  placeholder="e.g. PW1 — 231-11 Merrick Blvd, rev B" />
              </label>

              <label className="mb-3 block">
                <span className="lbl">Upload the file</span>
                <input type="file" name="file" className="field file:mr-3 file:rounded-sm file:border-0
                       file:bg-navy file:px-3 file:py-1 file:text-xs file:text-white" />
                <span className="mt-1 block text-xs text-ink-3">
                  {editDoc?.file_name
                    ? `Currently: ${editDoc.file_name} — choosing a new file replaces it.`
                    : "Optional. Uploading marks the document received automatically."}
                </span>
              </label>

              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="lbl">Status</span>
                  <select name="status" className="field" defaultValue={editDoc?.status || "received"}>
                    <option value="pending">Pending — expected</option>
                    <option value="received">Received</option>
                  </select>
                </label>
                <label className="block">
                  <span className="lbl">Date received</span>
                  <input type="date" name="received_at" className="field"
                    defaultValue={editDoc?.received_at || new Date().toISOString().slice(0, 10)} />
                </label>
              </div>

              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="lbl">From</span>
                  <input name="from_party" className="field" defaultValue={editDoc?.from_party || ""}
                    placeholder="Architect, client, DOB…" />
                </label>
                <label className="block">
                  <span className="lbl">Or link to it instead</span>
                  <input name="external_link" className="field" defaultValue={editDoc?.external_link || ""}
                    placeholder="Drive / Dropbox link" />
                </label>
              </div>

              <label className="block">
                <span className="lbl">Notes</span>
                <input name="notes" className="field" defaultValue={editDoc?.notes || ""} />
              </label>
            </div>
            <ModalFoot onClose={() => setDocOpen(false)} busy={pending} label="Save document" />
          </form>
        </Modal>
      )}

      {/* ── payment modal ── */}
      {payOpen && (
        <Modal title={editPay ? "Edit payment stage" : "New payment stage"} onClose={() => setPayOpen(false)}>
          <form action={(fd) => {
            run(() => savePayment(job.id, {
              id: editPay?.id ?? null,
              label: String(fd.get("label") || ""),
              amount: Number(fd.get("amount") || 0),
              due_date: String(fd.get("due_date") || "") || null,
              paid_date: String(fd.get("paid_date") || "") || null,
            }), () => { setPayOpen(false); setNote({ tone: "ok", text: "Payment stage saved." }); });
          }}>
            <div className="p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="lbl">Stage label</span>
                  <input name="label" className="field" defaultValue={editPay?.label || ""}
                    placeholder="Deposit, Installment 2, Final…" />
                </label>
                <label className="block">
                  <span className="lbl">Amount (USD)</span>
                  <input name="amount" type="number" min={0} step="0.01" className="field"
                    defaultValue={editPay ? Number(editPay.amount) : ""} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="lbl">Due date</span>
                  <input name="due_date" type="date" className="field" defaultValue={editPay?.due_date || ""} />
                </label>
                <label className="block">
                  <span className="lbl">Date paid</span>
                  <input name="paid_date" type="date" className="field" defaultValue={editPay?.paid_date || ""} />
                </label>
              </div>
              <p className="mt-3 text-xs text-ink-3">
                Leave &ldquo;date paid&rdquo; empty while the stage is outstanding. Anything past its due date
                with no payment shows as overdue.
              </p>
              {editPay && (
                <button type="button" className="btn-danger mt-3" disabled={pending}
                  onClick={() => { if (confirm(`Delete “${editPay.label}”?`)) run(() => deletePayment(editPay.id, job.id), () => setPayOpen(false)); }}>
                  Delete this stage
                </button>
              )}
            </div>
            <ModalFoot onClose={() => setPayOpen(false)} busy={pending} label="Save stage" />
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-[5vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[560px] border border-rule-strong bg-surface shadow-2xl">
        <h2 className="border-b border-rule border-t-[3px] border-t-orange bg-surface-2 px-5 py-3.5
                       font-display text-lg font-bold text-navy">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalFoot({ onClose, busy, label }: { onClose: () => void; busy: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-rule bg-surface-2 px-4 py-3">
      <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
      <button type="submit" className="btn" disabled={busy}>{busy ? "Saving…" : label}</button>
    </div>
  );
}
