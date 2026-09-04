import { createClient } from "@/lib/supabase/server";
import QuoteBuilder from "@/components/QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const supabase = await createClient();

  const [{ data: services }, { data: clients }] = await Promise.all([
    supabase.from("catalog_services").select("*").order("sort_order"),
    supabase.from("clients").select("*").eq("archived", false).order("company"),
  ]);

  let initial = null;
  if (edit) {
    const { data: q } = await supabase.from("quotes").select("*").eq("id", edit).single();
    if (q) {
      const { data: lines } = await supabase
        .from("quote_lines").select("*").eq("quote_id", edit).order("line_order");
      initial = {
        id: q.id, number: q.number, client_id: q.client_id ?? "",
        project: q.project ?? "", notes: q.notes ?? "",
        valid_days: q.valid_days ?? 30, apply_fee: q.apply_fee ?? true,
        lines: (lines || []).map((l) => ({
          service_id: l.service_id, name: l.name, category: l.category,
          qty: Number(l.qty), unit_price: Number(l.unit_price), discount: Number(l.discount),
        })),
      };
    }
  }

  return (
    <QuoteBuilder
      services={(services || []).map((s) => ({ ...s, price: Number(s.price) }))}
      clients={clients || []}
      initial={initial}
    />
  );
}
