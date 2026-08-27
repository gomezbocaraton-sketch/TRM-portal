'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError('Incorrect email or password.');
      return;
    }
    window.location.href = '/admin';
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-navy-tint">
          {/* Placeholder mark — swap for the real logo asset once the
              rebrand file (SVG/PNG) is ready. */}
          <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
            <path d="M32,58 L50,20 L68,58" stroke="#0A365D" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M16,86 L48,50 L60,62 L92,14" stroke="#C1571A" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polygon points="70,10 96,8 90,34" fill="#C1571A" />
          </svg>
        </div>
        <h1 className="mb-1 text-xl font-medium text-navy">TRM Partners</h1>
        <p className="mb-6 text-sm text-ink-soft">Admin sign in</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
