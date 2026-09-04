"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DISCOUNTS, CATEGORIES, FEE_RATE } from "@/lib/constants";
import { money, money2, totals } from "@/lib/money";
import { saveQuote, type DraftLine } from "@/app/(app)/quotes/actions";
import { saveClient } from "@/app/(app)/clients/actions";

type Service = { id: string; name: string; category: string; price: number; active: boolean };
type Client = {
  id: string; name: string; company: string | null; email: string | null;
  phone: string | null; addr1: string | null; city: string | null;
  state: string | null; zip: string | null; default_discount: number;
};

export default function QuoteBuilder({
  services, clients, initial,
}: {
  services: Service[];
  clients: Client[];
  initial?: {
    id: string; number: string; client_id: string; project: string;
    notes: string; valid_days: number; apply_fee: boolean; lines: DraftLine[];
  } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [lines, setLines] = useState<DraftLine[]>(initial?.lines ?? []);
  const [project, setProject] = useState(initial?.project ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [validDays, setValidDays] = useState(initial?.valid_days ?? 30);
  const [applyFee, setApplyFee] = useState(initial?.apply_fee ?? true);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState(initial?.id ?? null);
  const [number, setNumber] = useState(initial?.number ?? null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [nc, setNc] = useState({
    name: "", company: "", email: "", phone: "",
    addr1: "", city: "", state: "", zip: "", default_discount: 0,
  });
  const [ncErr, setNcErr] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId) || null;
  const t = totals(lines, applyFee, FEE_RATE);

  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const active = services.filter((s) => s.active);
    const hits = active.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
    return CATEGORIES.map((c) => ({ category: c, rows: hits.filter((s) => s.category === c) }))
      .filter((g) => g.rows.length);
  }, [services, search]);

  function addLine(s: Service) {
    setLines((prev) => [...prev, {
      service_id: s.id, name: s.name, category: s.category,
      qty: 1, unit_price: Number(s.price), discount: client?.default_discount ?? 0,
    }]);
  }
  function patchLine(i: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, ix) => (ix === i ? { ...l, ...patch } : l)));
  }

  function addClient() {
    setNcErr(null);
    startTransition(async () => {
      const res = await saveClient(nc);
      if (res?.error) { setNcErr(res.error); return; }
      // Pick the client we just made, so the quote carries on uninterrupted.
      const label = (nc.company || nc.name).trim();
      setNewClientOpen(false);
      setNc({ name: "", company: "", email: "", phone: "",
              addr1: "", city: "", state: "", zip: "", default_discount: 0 });
      setMsg(`${label} added — select them below.`);
      router.refresh();
    });
  }

  function commit(markSent: boolean) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveQuote(
        { id: quoteId, client_id: clientId, project, notes, valid_days: validDays, apply_fee: applyFee, lines },
        markSent
      );
      if ("error" in res && res.error) { setMsg(res.error); return; }
      if ("id" in res && res.id) {
        setQuoteId(res.id);
        setNumber(res.number ?? null);
        setMsg(`Quote ${res.number} saved${markSent ? " and marked sent" : ""}.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid items-start gap-5 lg:[grid-template-columns:340px_minmax(0,1fr)]">
      {/* ── left rail ── */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-16">
        <section className="panel">
          <h2 className="phead">Client</h2>
          <div className="p-3.5">
            <label className="mb-2 block">
              <span className="lbl">Bill to</span>
              <select className="field" value={clientId}
                onChange={(e) => setClientId(e.target.value)}>
                <option value="">— select a client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.company || c.name)} — {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-ghost btn-sm mb-2.5"
              onClick={() => { setNcErr(null); setNewClientOpen(true); }}>
              + New client
            </button>
            <p className="text-xs leading-relaxed text-ink-3">
              {client ? (
                <>
                  {client.email || "no email"}<br />
                  {client.phone || "no phone"}
                  {client.city && (<><br />{[client.addr1, client.city, client.state, client.zip].filter(Boolean).join(", ")}</>)}
                  {client.default_discount > 0 && (
                    <><br /><span className="pill bg-orange-soft text-orange-deep">
                      default {client.default_discount}% rate
                    </span></>
                  )}
                </>
              ) : "Pick a client above, or add one with the button. Their details print on the PDF."}
            </p>
          </div>
        </section>

        <section className="panel flex min-h-0 flex-1 flex-col">
          <h2 className="phead">
            Add services
            <span className="ml-auto font-mono text-[.68rem]">
              {grouped.reduce((a, g) => a + g.rows.length, 0)} / {services.filter((s) => s.active).length}
            </span>
          </h2>
          <div className="border-b border-rule p-3">
            <input className="field" placeholder="Search services…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-[52vh] overflow-y-auto">
            {grouped.map((g) => (
              <div key={g.category} className="border-b border-rule last:border-b-0">
                <h3 className="sticky top-0 bg-surface-2 px-3.5 pb-1 pt-2
                               font-mono text-[.64rem] uppercase tracking-[.09em] text-navy">
                  {g.category}
                </h3>
                {g.rows.map((s) => (
                  <button key={s.id} type="button" onClick={() => addLine(s)}
                    className="flex w-full items-baseline gap-2 border-b border-rule px-3.5
                               py-1.5 text-left text-sm last:border-b-0 hover:bg-navy-soft">
                    <span className="flex-1">{s.name}</span>
                    <span className="font-mono text-xs tabular-nums text-ink-2">
                      {money(Number(s.price))}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {!grouped.length && (
              <p className="px-4 py-8 text-center text-sm text-ink-3">
                Nothing matches “{search}”.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── quote sheet ── */}
      <section className="panel">
        <h2 className="phead">
          {number ? `Quote ${number}` : "New quote"}
          <button type="button" className="btn-ghost btn-sm ml-auto"
            onClick={() => { setLines([]); setQuoteId(null); setNumber(null); setProject(""); setNotes(""); }}>
            Clear
          </button>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="th w-[38%]">Service</th>
                <th className="th w-[64px] text-right">Qty</th>
                <th className="th w-[100px] text-right">Rate</th>
                <th className="th w-[160px]">Discount</th>
                <th className="th w-[110px] text-right">Amount</th>
                <th className="th w-[36px]" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="hover:bg-surface-2">
                  <td className="td">
                    <div className="font-semibold">{l.name}</div>
                    <div className="font-mono text-[.66rem] text-ink-3">{l.category}</div>
                  </td>
                  <td className="td num">
                    <input type="number" min={1} step={1} value={l.qty}
                      onChange={(e) => patchLine(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
                      className="field w-[54px] px-1.5 py-1 text-right" />
                  </td>
                  <td className="td num">
                    <input type="number" min={0} step={1} value={l.unit_price}
                      onChange={(e) => patchLine(i, { unit_price: Math.max(0, Number(e.target.value) || 0) })}
                      className="field w-[86px] px-1.5 py-1 text-right font-mono" />
                  </td>
                  <td className="td">
                    <select className="field px-1.5 py-1 text-xs" value={l.discount}
                      onChange={(e) => patchLine(i, { discount: Number(e.target.value) })}>
                      {DISCOUNTS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="td num">
                    {money2(l.qty * l.unit_price * (1 - l.discount / 100))}
                  </td>
                  <td className="td text-center">
                    <button type="button" aria-label="Remove line"
                      className="text-ink-3 hover:text-risk"
                      onClick={() => setLines((p) => p.filter((_, ix) => ix !== i))}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!lines.length && (
          <div className="px-5 py-11 text-center text-ink-3">
            <p className="font-display text-base text-ink-2">No lines yet</p>
            <p className="mt-1.5 text-sm">Pick services from the left. Each line carries its own discount.</p>
          </div>
        )}

        <div className="flex justify-end border-t border-rule-strong bg-surface-2 p-3.5">
          <dl className="grid w-full max-w-[340px] grid-cols-[1fr_auto] items-baseline gap-x-5 gap-y-1.5">
            <dt className="text-sm text-ink-2">Subtotal</dt>
            <dd className="num m-0">{money2(t.subtotal)}</dd>
            <dt className="text-sm text-ink-2">
              Discounts{lines.some((l) => l.discount === 40) && (
                <span className="pill ml-1.5 bg-orange-soft text-orange-deep">F&amp;F</span>
              )}
            </dt>
            <dd className="num m-0 text-risk">{t.discount > 0 ? "−" : ""}{money2(t.discount)}</dd>
            <dt className="text-sm text-ink-2">Net</dt>
            <dd className="num m-0">{money2(t.net)}</dd>
            <dt className={`text-sm text-ink-2 ${applyFee ? "" : "opacity-45"}`}>Online payment fee (3%)</dt>
            <dd className="num m-0">{money2(t.fee)}</dd>
            <dt className="mt-1 border-t border-rule-strong pt-2 font-display text-base font-bold text-navy">Total</dt>
            <dd className="num m-0 mt-1 border-t border-rule-strong pt-2 font-display text-xl font-bold text-navy">
              {money2(t.total)}
            </dd>
            <label className="col-span-2 mt-1 flex items-center gap-2 text-xs text-ink-2">
              <input type="checkbox" checked={applyFee} onChange={(e) => setApplyFee(e.target.checked)} />
              Add 3% online payment fee
            </label>
          </dl>
        </div>

        <div className="border-t border-rule p-3.5">
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="lbl">Project / job reference</span>
              <input className="field" value={project} onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. 231-11 Merrick Blvd — full build-out" />
            </label>
            <label className="block">
              <span className="lbl">Quote valid for (days)</span>
              <input type="number" min={1} max={365} className="field" value={validDays}
                onChange={(e) => setValidDays(Number(e.target.value) || 30)} />
            </label>
          </div>
          <label className="mb-3 block">
            <span className="lbl">Notes shown on the quote</span>
            <textarea className="field min-h-[64px]" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope assumptions, DOB filing fees excluded, payment schedule…" />
          </label>

          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={pending} onClick={() => commit(false)}>
              {pending ? "Saving…" : "Save quote"}
            </button>
            <button className="btn-ghost" disabled={pending} onClick={() => commit(true)}>
              Save &amp; mark sent
            </button>
            {quoteId && (
              <a className="btn-ghost" href={`/api/quotes/${quoteId}/pdf`}>Download PDF</a>
            )}
          </div>

          {msg && (
            <p className="mt-3 border-l-2 border-orange bg-orange-soft px-3 py-2 text-sm text-ink">
              {msg}{quoteId && msg.includes("saved") && (
                <> It&rsquo;s on the <a className="underline" href="/quotes">Quotes tab</a> now.</>
              )}
            </p>
          )}
        </div>
      </section>

      {newClientOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-[5vh]"
          onClick={(e) => { if (e.target === e.currentTarget) setNewClientOpen(false); }}>
          <div className="w-full max-w-[560px] border border-rule-strong bg-surface shadow-2xl">
            <h2 className="border-b border-rule border-t-[3px] border-t-orange bg-surface-2 px-5 py-3.5
                           font-display text-lg font-bold text-navy">New client</h2>
            <div className="p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="lbl">Contact name</span>
                  <input className="field" value={nc.name} autoFocus
                    onChange={(e) => setNc({ ...nc, name: e.target.value })} /></label>
                <label className="block"><span className="lbl">Company</span>
                  <input className="field" value={nc.company}
                    onChange={(e) => setNc({ ...nc, company: e.target.value })} /></label>
              </div>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="lbl">Email</span>
                  <input type="email" className="field" value={nc.email}
                    onChange={(e) => setNc({ ...nc, email: e.target.value })} /></label>
                <label className="block"><span className="lbl">Phone</span>
                  <input className="field" value={nc.phone}
                    onChange={(e) => setNc({ ...nc, phone: e.target.value })} /></label>
              </div>
              <label className="mb-3 block"><span className="lbl">Street address</span>
                <input className="field" value={nc.addr1}
                  onChange={(e) => setNc({ ...nc, addr1: e.target.value })} /></label>
              <div className="mb-3 grid gap-3 [grid-template-columns:2fr_1fr_1fr]">
                <label className="block"><span className="lbl">City</span>
                  <input className="field" value={nc.city}
                    onChange={(e) => setNc({ ...nc, city: e.target.value })} /></label>
                <label className="block"><span className="lbl">State</span>
                  <input className="field" value={nc.state}
                    onChange={(e) => setNc({ ...nc, state: e.target.value })} /></label>
                <label className="block"><span className="lbl">ZIP</span>
                  <input className="field" value={nc.zip}
                    onChange={(e) => setNc({ ...nc, zip: e.target.value })} /></label>
              </div>
              <label className="block"><span className="lbl">Default discount for this client</span>
                <select className="field" value={nc.default_discount}
                  onChange={(e) => setNc({ ...nc, default_discount: Number(e.target.value) })}>
                  {DISCOUNTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select></label>
              <p className="mt-1.5 text-xs text-ink-3">
                Applied automatically to every new line on their quotes. You can still change any line.
              </p>
              {ncErr && (
                <p className="mt-3 border-l-2 border-risk bg-risk-soft px-3 py-2 text-sm text-risk">{ncErr}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-rule bg-surface-2 px-4 py-3">
              <button className="btn-ghost" onClick={() => setNewClientOpen(false)}>Cancel</button>
              <button className="btn" disabled={pending} onClick={addClient}>
                {pending ? "Saving…" : "Save client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
