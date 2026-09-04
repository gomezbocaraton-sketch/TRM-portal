"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "./EmptyState";
import { DISCOUNTS } from "@/lib/constants";
import { saveClient, deleteClient, type ClientInput } from "@/app/(app)/clients/actions";

export type ClientRow = ClientInput & {
  id: string; quotes: number; jobs: number; firstJobId: string | null;
};

const EMPTY: ClientInput = {
  id: null, name: "", company: "", email: "", phone: "",
  addr1: "", city: "", state: "", zip: "", default_discount: 0,
};

export default function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClientInput>(EMPTY);
  const [err, setErr] = useState<string | null>(null);

  function edit(c?: ClientRow) {
    setErr(null);
    setForm(c ? { ...c } : EMPTY);
    setOpen(true);
  }
  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await saveClient(form);
      if (res?.error) { setErr(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }
  function remove(c: ClientRow) {
    if (!confirm(`Delete ${c.company || c.name}?`)) return;
    startTransition(async () => {
      const res = await deleteClient(c.id);
      if (res?.error) { alert(res.error); return; }
      router.refresh();
    });
  }

  const set = (k: keyof ClientInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === "default_discount" ? Number(e.target.value) : e.target.value }));

  return (
    <section className="panel">
      <h2 className="phead">
        Clients
        <button className="btn-ghost btn-sm ml-auto" onClick={() => edit()}>+ New client</button>
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="th">Name</th><th className="th">Company</th><th className="th">Email</th>
              <th className="th">Phone</th><th className="th">Location</th><th className="th">Rate</th>
              <th className="th text-right">Quotes</th><th className="th text-right">Jobs</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2">
                <td className="td font-semibold">{c.name}</td>
                <td className="td">{c.company || "—"}</td>
                <td className="td text-xs text-ink-3">{c.email || "—"}</td>
                <td className="td font-mono text-xs text-ink-3">{c.phone || "—"}</td>
                <td className="td text-xs text-ink-3">
                  {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="td">
                  {c.default_discount ? (
                    <span className={`pill ${c.default_discount === 40
                      ? "bg-orange-soft text-orange-deep" : "bg-surface-3 text-ink-2"}`}>
                      {c.default_discount}%
                    </span>
                  ) : <span className="text-xs text-ink-3">list</span>}
                </td>
                <td className="td num">{c.quotes}</td>
                <td className="td num">{c.jobs}</td>
                <td className="td">
                  <div className="flex flex-nowrap justify-end gap-1.5">
                    <Link className="btn-ghost btn-sm" href="/quotes/new">Quote</Link>
                    {c.firstJobId && (
                      <Link className="btn-ghost btn-sm" href={`/jobs/${c.firstJobId}`}>Job</Link>
                    )}
                    <button className="btn-ghost btn-sm" onClick={() => edit(c)}>Edit</button>
                    <button className="btn-danger" disabled={pending} onClick={() => remove(c)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && <EmptyState title="No clients yet">Add one to start quoting.</EmptyState>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-[5vh]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-[560px] border border-rule-strong bg-surface shadow-2xl">
            <h2 className="border-b border-rule border-t-[3px] border-t-orange bg-surface-2 px-5 py-3.5
                           font-display text-lg font-bold text-navy">
              {form.id ? "Edit client" : "New client"}
            </h2>
            <div className="p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="lbl">Contact name</span>
                  <input className="field" value={form.name} onChange={set("name")} /></label>
                <label className="block"><span className="lbl">Company</span>
                  <input className="field" value={form.company} onChange={set("company")} /></label>
              </div>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="lbl">Email</span>
                  <input type="email" className="field" value={form.email} onChange={set("email")} /></label>
                <label className="block"><span className="lbl">Phone</span>
                  <input className="field" value={form.phone} onChange={set("phone")} /></label>
              </div>
              <label className="mb-3 block"><span className="lbl">Street address</span>
                <input className="field" value={form.addr1} onChange={set("addr1")} /></label>
              <div className="mb-3 grid gap-3 [grid-template-columns:2fr_1fr_1fr]">
                <label className="block"><span className="lbl">City</span>
                  <input className="field" value={form.city} onChange={set("city")} /></label>
                <label className="block"><span className="lbl">State</span>
                  <input className="field" value={form.state} onChange={set("state")} /></label>
                <label className="block"><span className="lbl">ZIP</span>
                  <input className="field" value={form.zip} onChange={set("zip")} /></label>
              </div>
              <label className="block"><span className="lbl">Default discount for this client</span>
                <select className="field" value={form.default_discount} onChange={set("default_discount")}>
                  {DISCOUNTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select></label>
              <p className="mt-1.5 text-xs text-ink-3">
                Applied automatically to every new line on their quotes. You can still change any line.
              </p>
              {err && <p className="mt-3 border-l-2 border-risk bg-risk-soft px-3 py-2 text-sm text-risk">{err}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-rule bg-surface-2 px-4 py-3">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" disabled={pending} onClick={submit}>
                {pending ? "Saving…" : "Save client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
