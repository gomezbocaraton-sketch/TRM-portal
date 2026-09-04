import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JobDetail from "@/components/JobDetail";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, number, project, contract_value, status, notes, started_at, quote_id, client:clients(name, company, email, phone)")
    .eq("id", id).maybeSingle();
  if (!job) notFound();

  const [{ data: work }, { data: payments }, { data: documents }] = await Promise.all([
    supabase.from("job_work_items").select("*").eq("job_id", id).order("item_order"),
    supabase.from("job_payments").select("*").eq("job_id", id).order("stage_order"),
    supabase.from("job_documents").select("*").eq("job_id", id).order("created_at"),
  ]);

  return (
    <JobDetail
      job={{
        ...job,
        contract_value: Number(job.contract_value),
        client: Array.isArray(job.client) ? job.client[0] ?? null : job.client,
      }}
      work={(work || []).map((w) => ({ ...w, qty: Number(w.qty) }))}
      payments={(payments || []).map((p) => ({ ...p, amount: Number(p.amount) }))}
      documents={documents || []}
    />
  );
}
