"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Pill from "./Pill";
import { CATEGORIES } from "@/lib/constants";
import { money } from "@/lib/money";
import { saveService, toggleService } from "@/app/(app)/catalog/actions";

export type Service = {
  id: string; name: string; category: string; price: number;
  note: string | null; active: boolean;
};

const EMPTY = { id: null as string | null, name: "", category: CATEGORIES[0] as string, price: 0, note: "" };

export default function CatalogTable({ rows }: { rows: Service[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState<string | null>(null);

  function edit(s?: Service) {
    setErr(null);
    setForm(s ? { id: s.id, name: s.name, category: s.category, price: Number(s.price), note: s.note ?? "" } : EMPTY);
    setOpen(true);
  }
  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await saveService(form);
      if (res?.error) { setErr(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  const byCategory = CATEGORIES.map((c) => ({
    category: c,
    items: rows.filter((s) => s.category === c).sort((a, b) => Number(b.price) - Number(a.price)),
  })).filter((g) => g.items.length);

  return (
    <section className="panel">
      <h2 className="phead">
        Service catalog
        <span className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[.68rem]">
            {rows.filter((s) => s.active).length} active · {rows.length} total
          </span>
          <button className="btn-ghost btn-sm" onClick={() => edit()}>+ New service</button>
        </span>
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="th">Service</th><th className="th w-[26%]">Category</th>
              <th className="th text-right">Rate</th><th className="th w-[110px]">Status</th>
              <th className="th w-[150px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((g) => g.items.map((s) => (
              <tr key={s.id} className="hover:bg-surface-2">
                <td className="td">
                  <div className="font-semibold">{s.name}</div>
                  {s.note && <div className="text-xs text-ink-3">{s.note}</div>}
                </td>
                <td className="td text-xs text-ink-3">{s.category}</td>
                <td className="td num">{money(Number(s.price))}</td>
                <td className="td">
                  <Pill tone={s.active ? "approved" : "declined"}>{s.active ? "active" : "inactive"}</Pill>
                </td>
                <td className="td">
                  <div className="flex flex-nowrap justify-end gap-1.5">
                    <button className="btn-ghost btn-sm" onClick={() => edit(s)}>Edit</button>
                    <button className="btn-ghost btn-sm" disabled={pending}
                      onClick={() => startTransition(async () => {
                        await toggleService(s.id, !s.active);
                        router.refresh();
                      })}>
                      {s.active ? "Retire" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-[5vh]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-[560px] border border-rule-strong bg-surface shadow-2xl">
            <h2 className="border-b border-rule border-t-[3px] border-t-orange bg-surface-2 px-5 py-3.5
                           font-display text-lg font-bold text-navy">
              {form.id ? "Edit service" : "New service"}
            </h2>
            <div className="p-4">
              <label className="mb-3 block"><span className="lbl">Service name</span>
                <input className="field" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></label>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="lbl">Revenue category</span>
                  <select className="field" value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select></label>
                <label className="block"><span className="lbl">Rate (USD)</span>
                  <input type="number" min={0} step={1} className="field" value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} /></label>
              </div>
              <label className="block"><span className="lbl">Internal note</span>
                <input className="field" value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Optional — shown only in the catalog" /></label>
              {err && <p className="mt-3 border-l-2 border-risk bg-risk-soft px-3 py-2 text-sm text-risk">{err}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-rule bg-surface-2 px-4 py-3">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" disabled={pending} onClick={submit}>
                {pending ? "Saving…" : "Save service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
