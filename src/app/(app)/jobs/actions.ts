"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPES } from "@/lib/doctypes";

const BUCKET = "job-documents";

/* ── job ─────────────────────────────────────────────────────────── */

export async function setJobStatus(jobId: string, status: "active" | "hold" | "complete") {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({
    status,
    completed_at: status === "complete" ? new Date().toISOString() : null,
  }).eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

export async function saveJobNotes(jobId: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ notes }).eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

export async function setWorkStage(itemId: string, stage: string, jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("job_work_items")
    .update({ stage, updated_at: new Date().toISOString() }).eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/* ── payments ────────────────────────────────────────────────────── */

export async function markPaid(paymentId: string, jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("job_payments")
    .update({ paid_date: new Date().toISOString().slice(0, 10) }).eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

export async function savePayment(
  jobId: string,
  p: { id?: string | null; label: string; amount: number; due_date: string | null; paid_date: string | null }
) {
  const supabase = await createClient();
  if (!p.label.trim()) return { error: "Give the stage a label." };
  if (!(p.amount > 0)) return { error: "Enter an amount." };

  const body = {
    job_id: jobId, label: p.label.trim(), amount: p.amount,
    due_date: p.due_date || null, paid_date: p.paid_date || null,
  };
  const { error } = p.id
    ? await supabase.from("job_payments").update(body).eq("id", p.id)
    : await supabase.from("job_payments").insert(body);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

export async function deletePayment(paymentId: string, jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("job_payments").delete().eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/* ── documents ───────────────────────────────────────────────────── */

/** Pre-populate the register with every document these categories
 *  expect, all marked pending. Existing types are left alone. */
export async function buildChecklist(jobId: string) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("job_work_items").select("category").eq("job_id", jobId);
  const categories = Array.from(new Set((items || []).map((i) => i.category)));

  const { data: existing } = await supabase
    .from("job_documents").select("doc_type").eq("job_id", jobId);
  const have = new Set((existing || []).map((d) => d.doc_type));

  const rows: { job_id: string; doc_type: string; label: string; category: string; status: string }[] = [];
  for (const c of categories)
    for (const t of DOC_TYPES[c] || [])
      if (!have.has(t)) {
        have.add(t);
        rows.push({ job_id: jobId, doc_type: t, label: t, category: c, status: "pending" });
      }

  if (!rows.length) return { ok: true, added: 0, categories: categories.length };
  const { error } = await supabase.from("job_documents").insert(rows);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true, added: rows.length, categories: categories.length };
}

/** Save a document record, optionally with a real uploaded file.
 *  Called with FormData so the file can ride along. */
export async function saveDocument(form: FormData) {
  const supabase = await createClient();

  const jobId = String(form.get("job_id") || "");
  const docId = String(form.get("doc_id") || "") || null;
  const docType = String(form.get("doc_type") || "");
  const label = String(form.get("label") || "").trim() || docType;
  const status = String(form.get("status") || "pending");
  const receivedAt = String(form.get("received_at") || "") || null;
  const fromParty = String(form.get("from_party") || "").trim() || null;
  const externalLink = String(form.get("external_link") || "").trim() || null;
  const notes = String(form.get("notes") || "").trim() || null;
  const file = form.get("file") as File | null;

  if (!jobId || !docType) return { error: "Missing job or document type." };

  const body: Record<string, unknown> = {
    job_id: jobId, doc_type: docType, label, status,
    received_at: status === "received" ? (receivedAt || new Date().toISOString().slice(0, 10)) : null,
    from_party: fromParty, external_link: externalLink, notes,
  };

  // Upload first — if storage fails we don't want a half-written row.
  if (file && file.size > 0) {
    const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
    const path = `${jobId}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) return { error: `Upload failed: ${upErr.message}` };

    body.storage_path = path;
    body.file_name = file.name;
    body.file_size = file.size;
    body.mime_type = file.type || null;
    body.status = "received";
    body.received_at = receivedAt || new Date().toISOString().slice(0, 10);
  }

  const { error } = docId
    ? await supabase.from("job_documents").update(body).eq("id", docId)
    : await supabase.from("job_documents").insert(body);
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

export async function markDocReceived(docId: string, jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("job_documents").update({
    status: "received", received_at: new Date().toISOString().slice(0, 10),
  }).eq("id", docId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

export async function deleteDocument(docId: string, jobId: string) {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("job_documents").select("storage_path").eq("id", docId).single();
  if (doc?.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  }
  const { error } = await supabase.from("job_documents").delete().eq("id", docId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** Short-lived signed URL — the bucket is private, so this is how a
 *  stored file is opened or downloaded. */
export async function documentUrl(docId: string) {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("job_documents").select("storage_path").eq("id", docId).single();
  if (!doc?.storage_path) return { error: "No file stored for that document." };
  const { data, error } = await supabase.storage
    .from(BUCKET).createSignedUrl(doc.storage_path, 60 * 10);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
