"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { FIRM } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/quotes");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo-mark.png" alt="" width={72} height={90} priority />
          <h1 className="mt-4 text-xl font-bold text-navy">{FIRM.legal}</h1>
          <p className="mt-1 font-mono text-[.65rem] uppercase tracking-[.14em] text-orange-deep">
            Quote Desk
          </p>
        </div>

        <form onSubmit={submit} className="panel border-t-[3px] border-t-orange p-6">
          <label className="mb-4 block">
            <span className="lbl">Email</span>
            <input type="email" required autoComplete="username" className="field"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="mb-5 block">
            <span className="lbl">Password</span>
            <input type="password" required autoComplete="current-password" className="field"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && (
            <p className="mb-4 border-l-2 border-risk bg-risk-soft px-3 py-2 text-sm text-risk">
              {error}
            </p>
          )}
          <button type="submit" className="btn w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-3">
          {FIRM.addr} · {FIRM.city}
        </p>
      </div>
    </main>
  );
}
