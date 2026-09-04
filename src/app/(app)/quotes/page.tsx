import { createClient } from "@/lib/supabase/server";
import StatStrip from "@/components/StatStrip";
import QuoteTable, { type QuoteRow } from "@/components/QuoteTable";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("id, number, project, total, status, created_at, sent_at, approved_at, client:clients(name, company, email)")
    .order("created_at", { ascending: false });

  const rows: QuoteRow[] = (data || []).map((q) => ({
    ...q,
    total: Number(q.total),
    client: Array.isArray(q.client) ? q.client[0] ?? null : q.client,
  })) as QuoteRow[];

  const sent = rows.filter((q) => q.status !== "draft");
  const approved = rows.filter((q) => q.status === "approved");
  const sum = (a: QuoteRow[]) => a.reduce((n, q) => n + q.total, 0);

  const days = approved
    .filter((q) => q.sent_at && q.approved_at)
    .map((q) => (+new Date(q.approved_at!) - +new Date(q.sent_at!)) / 86400000);
  const avg = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;

  return (
    <>
      <StatStrip items={[
        { label: "Quotes", value: String(rows.length) },
        { label: "Sent value", value: money(sum(sent)) },
        { label: "Approved value", value: money(sum(approved)), tone: "good" },
        { label: "Win rate", value: sent.length ? `${Math.round((approved.length / sent.length) * 100)}%` : "—" },
        { label: "Avg days to approve", value: avg === null ? "—" : String(avg) },
      ]} />
      <QuoteTable rows={rows} />
    </>
  );
}
