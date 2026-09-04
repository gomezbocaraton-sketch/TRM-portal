"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="font-mono text-[.7rem] uppercase tracking-[.06em] text-ink-3 hover:text-orange-deep"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}>
      Sign out
    </button>
  );
}
