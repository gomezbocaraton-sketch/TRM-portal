"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { totals } from "@/lib/money";
import { FEE_RATE } from "@/lib/constants";
import { quotePdfBuffer, quotePdfFilename, type PdfQuote } from "@/lib/pdf";
import { FIRM } from "@/lib/constants";

export type DraftLine = {
  service_id: string | null;
  name: string;
  category: string;
  qty: number;
  unit_price: number;
  discount: number;
};

export type DraftQuote = {
  id?: string | null;
  client_id: string;
  project: string;
  notes: string;
  valid_days: number;
  apply_fee: boolean;
  lines: DraftLine[];
};

/** Create or update a quote and its lines. */
export async function saveQuote(draft: DraftQuote, markSent = false) {
  const supabase = await createClient();

  if (!draft.client_id) return { error: "Pick a client first." };
  if (!draft.lines.length) return { error: "Add at least one line." };

  const { data: client, error: cErr } = await supabase
    .from("clients").select("*").eq("id", draft.client_id).single();
  if (cErr || !client) return { error: "That client no longer exists." };

  const t = totals(draft.lines, draft.apply_fee, FEE_RATE);
  const now = new Date().toISOString();

  let quoteId = draft.id || null;
  let number: string;

  if (quoteId) {
    const { data: existing } = await supabase
      .from("quotes").select("number, status, sent_at").eq("id", quoteId).single();
    number = existing?.number ?? "";
    const patch: Record<string, unknown> = {
      client_id: draft.client_id,
      client_snapshot: client,
      project: draft.project || null,
      notes: draft.notes || null,
      valid_days: draft.valid_days,
      apply_fee: draft.apply_fee,
      subtotal: t.subtotal, discount: t.discount, net: t.net,
      fee_amount: t.fee, total: t.total,
    };
    if (markSent && !existing?.sent_at) { patch.sent_at = now; patch.status = "sent"; }
    const { error } = await supabase.from("quotes").update(patch).eq("id", quoteId);
    if (error) return { error: error.message };
    await supabase.from("quote_lines").delete().eq("quote_id", quoteId);
  } else {
    const { data: numData, error: nErr } = await supabase.rpc("next_quote_number");
    if (nErr) return { error: nErr.message };
    number = numData as string;
    const { data, error } = await supabase.from("quotes").insert({
      number,
      client_id: draft.client_id,
      client_snapshot: client,
      project: draft.project || null,
      notes: draft.notes || null,
      valid_days: draft.valid_days,
      apply_fee: draft.apply_fee,
      subtotal: t.subtotal, discount: t.discount, net: t.net,
      fee_amount: t.fee, total: t.total,
      status: markSent ? "sent" : "draft",
      sent_at: markSent ? now : null,
    }).select("id").single();
    if (error) return { error: error.message };
    quoteId = data.id;
  }

  const rows = draft.lines.map((l, i) => ({
    quote_id: quoteId,
    service_id: l.service_id,
    name: l.name,
    category: l.category,
    qty: l.qty,
    unit_price: l.unit_price,
    discount: l.discount,
    line_order: i,
  }));
  const { error: lErr } = await supabase.from("quote_lines").insert(rows);
  if (lErr) return { error: lErr.message };

  revalidatePath("/quotes");
  revalidatePath("/jobs");
  return { id: quoteId, number };
}

/** Move a quote through its lifecycle. Approving opens a job. */
export async function setQuoteStatus(
  quoteId: string,
  status: "draft" | "sent" | "approved" | "declined"
) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: q, error } = await supabase
    .from("quotes").select("*").eq("id", quoteId).single();
  if (error || !q) return { error: "Quote not found." };

  const patch: Record<string, unknown> = { status };
  if (status === "sent" && !q.sent_at) patch.sent_at = now;
  if (status === "approved") {
    patch.approved_at = now;
    if (!q.sent_at) patch.sent_at = now;
  }
  if (status === "declined") patch.declined_at = now;

  const { error: uErr } = await supabase.from("quotes").update(patch).eq("id", quoteId);
  if (uErr) return { error: uErr.message };

  let jobNumber: string | null = null;
  if (status === "approved") jobNumber = await openJobForQuote(quoteId);

  revalidatePath("/quotes");
  revalidatePath("/jobs");
  return { ok: true, jobNumber };
}

/** Turn an approved quote into a live job: work items from the quote
 *  lines, and a deposit-plus-installments schedule. */
async function openJobForQuote(quoteId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: already } = await supabase
    .from("jobs").select("id").eq("quote_id", quoteId).maybeSingle();
  if (already) return null;

  const { data: q } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
  if (!q) return null;
  const { data: lines } = await supabase
    .from("quote_lines").select("*").eq("quote_id", quoteId).order("line_order");

  const number = `JOB-${q.number}`;
  const { data: job, error } = await supabase.from("jobs").insert({
    number,
    quote_id: q.id,
    client_id: q.client_id,
    project: q.project,
    contract_value: q.total,
    status: "active",
  }).select("id").single();
  if (error || !job) return null;

  if (lines?.length) {
    await supabase.from("job_work_items").insert(
      lines.map((l, i) => ({
        job_id: job.id, name: l.name, category: l.category,
        qty: l.qty, stage: "todo", item_order: i,
      }))
    );
  }

  // 30% deposit, then three monthly installments — the shape the
  // Square invoices actually used on jobs this size.
  const total = Number(q.total) || 0;
  const round = (n: number) => Math.round(n * 100) / 100;
  const deposit = round(total * 0.3);
  const each = round((total - deposit) / 3);
  const start = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const pays = [{ label: "Deposit (30%)", amount: deposit, due_date: iso(start), stage_order: 0 }];
  let running = deposit;
  for (let i = 1; i <= 3; i++) {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i);
    const amount = i === 3 ? round(total - running) : each;
    running = round(running + amount);
    pays.push({ label: `Installment ${i}`, amount, due_date: iso(due), stage_order: i });
  }
  await supabase.from("job_payments").insert(pays.map((p) => ({ ...p, job_id: job.id })));

  return number;
}

export async function deleteQuote(quoteId: string) {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs").select("number").eq("quote_id", quoteId).maybeSingle();
  if (job) return { error: `That quote has a live job (${job.number}) — close the job first.` };
  const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
  if (error) return { error: error.message };
  revalidatePath("/quotes");
  return { ok: true };
}

/** Load a quote in the shape the PDF builder wants. */
export async function loadQuoteForPdf(quoteId: string): Promise<PdfQuote | null> {
  const supabase = await createClient();
  const { data: q } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
  if (!q) return null;
  const { data: lines } = await supabase
    .from("quote_lines").select("*").eq("quote_id", quoteId).order("line_order");
  return {
    number: q.number,
    created_at: q.created_at,
    valid_days: q.valid_days,
    project: q.project,
    notes: q.notes,
    subtotal: Number(q.subtotal), discount: Number(q.discount), net: Number(q.net),
    fee_amount: Number(q.fee_amount), total: Number(q.total),
    client: q.client_snapshot || {},
    lines: (lines || []).map((l) => ({
      name: l.name, category: l.category,
      qty: Number(l.qty), unit_price: Number(l.unit_price), discount: Number(l.discount),
    })),
  };
}

/** Email the quote PDF to the client and stamp the sent date. */
export async function emailQuote(quoteId: string, message?: string) {
  if (!process.env.RESEND_API_KEY) {
    return { error: "Email isn't configured yet — add RESEND_API_KEY in Vercel. You can still download the PDF and send it yourself." };
  }
  const q = await loadQuoteForPdf(quoteId);
  if (!q) return { error: "Quote not found." };
  const to = q.client.email;
  if (!to) return { error: "That client has no email address on file." };

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const pdf = quotePdfBuffer(q);
  const filename = quotePdfFilename(q);
  const who = q.client.company || q.client.name || "there";

  const body =
    message?.trim() ||
    `Hello ${who},\n\nPlease find attached quote ${q.number}${q.project ? ` for ${q.project}` : ""}.\n\n` +
    `The quote is valid for ${q.valid_days || 30} days. Let me know if you have any questions or would like anything adjusted.\n\n` +
    `Thank you,\n${FIRM.name}\n${FIRM.phone}`;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || `${FIRM.name} <onboarding@resend.dev>`,
    replyTo: process.env.EMAIL_REPLY_TO || FIRM.email,
    to: [to],
    subject: `Quote ${q.number} — ${FIRM.name}`,
    text: body,
    attachments: [{ filename, content: pdf.toString("base64") }],
  });
  if (error) return { error: error.message };

  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("quotes").select("sent_at, status").eq("id", quoteId).single();
  await supabase.from("quotes").update({
    sent_at: cur?.sent_at || new Date().toISOString(),
    status: cur?.status === "draft" ? "sent" : cur?.status,
  }).eq("id", quoteId);

  revalidatePath("/quotes");
  return { ok: true, to };
}
