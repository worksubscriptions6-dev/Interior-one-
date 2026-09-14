'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArchMark } from '@/components/arch-mark';

/**
 * Full sign-in. Needed once per device — after this the PIN screen is all
 * anyone sees day to day.
 */
export default function LoginPage() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/leads';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError('');
    const { error: err } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);

    if (err) {
      setError('That email and password do not match.');
      return;
    }
    router.replace(`/lock?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#1D1913] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <ArchMark className="mb-4 h-10 w-14 text-gold" />
          <h1 className="font-display text-3xl text-[#F7F2E8]">Interior One</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#8D8271]">
            Designed · Built · Delivered
          </p>
        </div>

        <p className="mb-6 text-center text-sm text-[#A0947F]">
          Sign in once on this device. After that it is just your PIN.
        </p>

        <div className="space-y-3">
          <input
            type="email"
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-white/12 bg-white/5 px-4 py-3 text-[#F7F2E8] placeholder:text-[#6F6657] focus:border-gold focus:outline-none"
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && signIn()}
            className="w-full rounded-md border border-white/12 bg-white/5 px-4 py-3 text-[#F7F2E8] placeholder:text-[#6F6657] focus:border-gold focus:outline-none"
          />
        </div>

        <p className="mt-3 h-5 text-center text-xs text-[#D0705F]" role="alert">
          {error}
        </p>

        <button
          onClick={signIn}
          disabled={busy || !email || !password}
          className="mt-3 w-full rounded-md bg-gold py-3 font-medium text-[#191510] transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </main>
  );
}
