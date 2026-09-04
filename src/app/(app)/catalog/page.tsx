import { createClient } from "@/lib/supabase/server";
import CatalogTable, { type Service } from "@/components/CatalogTable";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("catalog_services").select("*").order("sort_order");
  const rows: Service[] = (data || []).map((s) => ({ ...s, price: Number(s.price) }));
  return <CatalogTable rows={rows} />;
}
