import { createClient } from "@/lib/supabase/server";
import ClientsTable, { type ClientRow } from "@/components/ClientsTable";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: quotes }, { data: jobs }] = await Promise.all([
    supabase.from("clients").select("*").eq("archived", false).order("company"),
    supabase.from("quotes").select("client_id"),
    supabase.from("jobs").select("id, client_id").order("started_at", { ascending: false }),
  ]);

  const rows: ClientRow[] = (clients || []).map((c) => ({
    id: c.id, name: c.name, company: c.company ?? "", email: c.email ?? "",
    phone: c.phone ?? "", addr1: c.addr1 ?? "", city: c.city ?? "",
    state: c.state ?? "", zip: c.zip ?? "", default_discount: c.default_discount ?? 0,
    quotes: (quotes || []).filter((q) => q.client_id === c.id).length,
    jobs: (jobs || []).filter((j) => j.client_id === c.id).length,
    firstJobId: (jobs || []).find((j) => j.client_id === c.id)?.id ?? null,
  }));

  return <ClientsTable rows={rows} />;
}
