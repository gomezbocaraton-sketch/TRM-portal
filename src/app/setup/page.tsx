import Image from "next/image";
import { readSupabaseEnv } from "@/lib/env";
import { FIRM } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  const { problems } = readSupabaseEnv();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex items-center gap-4">
        <Image src="/logo-mark.png" alt="" width={46} height={57} priority />
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{FIRM.legal}</h1>
          <p className="font-mono text-[.65rem] uppercase tracking-[.14em] text-orange-deep">
            Quote Desk · setup
          </p>
        </div>
      </div>

      <div className="panel border-t-[3px] border-t-orange">
        <h2 className="phead">Not connected to Supabase yet</h2>
        <div className="p-5">
          <p className="mb-4 text-ink-2">
            The site is deployed and running. It just cannot reach the database, because
            {problems.length === 1 ? " one setting is" : " these settings are"} missing or wrong:
          </p>

          <ul className="mb-5 space-y-3">
            {problems.map((p) => (
              <li key={p.key} className="border-l-2 border-risk bg-risk-soft px-4 py-3">
                <code className="font-mono text-sm font-semibold">{p.key}</code>
                <p className="mt-1 text-sm text-ink-2">{p.problem}</p>
              </li>
            ))}
          </ul>

          <h3 className="mb-2 font-display text-base font-bold text-navy">How to fix it</h3>
          <ol className="ml-5 list-decimal space-y-2 text-sm text-ink-2">
            <li>In Vercel, open this project → <b>Settings → Environment Variables</b>.</li>
            <li>
              Add each variable with the <b>name in the Key box</b> and the value from
              Supabase (<b>Settings → API</b>) in the Value box:
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="th">Key</th>
                      <th className="th">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="td font-mono">NEXT_PUBLIC_SUPABASE_URL</td>
                      <td className="td">
                        The <b>Project URL</b> — ends at <code>.supabase.co</code>, nothing after it
                      </td>
                    </tr>
                    <tr>
                      <td className="td font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</td>
                      <td className="td">
                        The <b>anon public</b> key — a long string starting <code>eyJ</code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </li>
            <li>
              Make sure both are enabled for <b>Production</b> (the Environments dropdown).
            </li>
            <li>
              Go to <b>Deployments</b>, open the latest one, and choose <b>Redeploy</b>.
              Environment variables only take effect on a new build — saving them is not enough.
            </li>
          </ol>

          <p className="mt-5 border-l-2 border-orange bg-orange-soft px-4 py-3 text-sm">
            This page disappears on its own once both values are correct. Reload after the
            redeploy finishes and you will land on the login screen.
          </p>
        </div>
      </div>
    </main>
  );
}
