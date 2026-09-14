'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArchMark } from '@/components/arch-mark';
import { Keypad, PinDots } from '@/components/keypad';

const LENGTH = 4;

export default function LockPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/leads';

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (value: string) => {
      setBusy(true);
      setError('');
      try {
        const res = await fetch('/api/pin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: value }),
        });
        if (res.ok) {
          router.replace(next);
          router.refresh();
          return;
        }
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? 'That PIN did not work.');
        setPin('');
      } catch {
        setError('No connection. Try again.');
        setPin('');
      } finally {
        setBusy(false);
      }
    },
    [next, router],
  );

  const press = useCallback(
    (key: string) => {
      if (busy) return;
      setError('');
      setPin((current) => {
        if (key === 'del') return current.slice(0, -1);
        if (current.length >= LENGTH) return current;
        const value = current + key;
        if (value.length === LENGTH) void submit(value);
        return value;
      });
    },
    [busy, submit],
  );

  // A physical keyboard should work too, for whoever is on a laptop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#1D1913] px-6 py-12">
      <div className="w-full max-w-xs">
        <div className="mb-10 flex flex-col items-center text-center">
          <ArchMark className="mb-4 h-10 w-14 text-gold" />
          <h1 className="font-display text-3xl text-[#F7F2E8]">Interior One</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#8D8271]">
            Karunagappally
          </p>
        </div>

        <p className="mb-5 text-center text-sm text-[#A0947F]">
          {busy ? 'Checking…' : 'Enter your PIN'}
        </p>

        <div className="mb-3">
          <PinDots length={pin.length} total={LENGTH} />
        </div>

        <p className="mb-6 h-5 text-center text-xs text-[#D0705F]" role="alert">
          {error}
        </p>

        <Keypad onPress={press} disabled={busy} />

        <form action="/auth/signout" method="post" className="mt-8 text-center">
          <button type="submit" className="text-xs text-[#6F6657] underline underline-offset-4">
            Not you? Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
