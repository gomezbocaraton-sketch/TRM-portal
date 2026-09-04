"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClientInput = {
  id?: string | null;
  name: string; company: string; email: string; phone: string;
  addr1: string; city: string; state: string; zip: string;
  default_discount: number;
};

export async function saveClient(c: ClientInput) {
  const supabase = await createClient();
  if (!c.name.trim()) return { error: "A contact name is required." };

  const body = {
    name: c.name.trim(),
    company: c.company.trim() || null,
    email: c.email.trim() || null,
    phone: c.phone.trim() || null,
    addr1: c.addr1.trim() || null,
    city: c.city.trim() || null,
    state: c.state.trim() || null,
    zip: c.zip.trim() || null,
    default_discount: c.default_discount,
  };
  const { error } = c.id
    ? await supabase.from("clients").update(body).eq("id", c.id)
    : await supabase.from("clients").insert(body);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath("/quotes/new");
  return { ok: true };
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  const [{ count: quoteCount }, { count: jobCount }] = await Promise.all([
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("client_id", id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("client_id", id),
  ]);
  if ((quoteCount ?? 0) > 0 || (jobCount ?? 0) > 0)
    return { error: "That client has quotes or jobs on file — archive them instead of deleting." };
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true };
}
