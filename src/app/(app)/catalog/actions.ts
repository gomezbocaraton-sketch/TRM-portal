"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveService(s: {
  id?: string | null; name: string; category: string; price: number; note: string;
}) {
  const supabase = await createClient();
  if (!s.name.trim()) return { error: "A service name is required." };
  if (!(s.price >= 0)) return { error: "Enter a rate." };

  const body = {
    name: s.name.trim(), category: s.category,
    price: s.price, note: s.note.trim() || null,
  };
  const { error } = s.id
    ? await supabase.from("catalog_services").update(body).eq("id", s.id)
    : await supabase.from("catalog_services").insert({ ...body, sort_order: 999 });
  if (error) return { error: error.message };
  revalidatePath("/catalog");
  revalidatePath("/quotes/new");
  return { ok: true };
}

export async function toggleService(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_services").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalog");
  revalidatePath("/quotes/new");
  return { ok: true };
}
