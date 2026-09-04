import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FIRM } from "@/lib/constants";
import NavTabs from "@/components/NavTabs";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name").eq("id", user.id).maybeSingle();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-navy bg-surface">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-7 px-5">
          <Link href="/quotes" className="flex items-center gap-3 py-1.5">
            <Image src="/logo-mark.png" alt="" width={38} height={47} priority />
            <span className="flex flex-col">
              <span className="font-display text-base font-bold leading-tight text-navy">
                {FIRM.name}
              </span>
              <span className="font-mono text-[.63rem] uppercase tracking-[.13em] text-orange-deep">
                Quote Desk
              </span>
            </span>
          </Link>
          <NavTabs />
          <div className="ml-auto flex items-center gap-3 py-3">
            <span className="hidden text-xs text-ink-3 sm:inline">
              {profile?.full_name || user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-5 pb-24 pt-6">{children}</main>
    </div>
  );
}
