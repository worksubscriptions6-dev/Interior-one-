'use client';

import { cn } from '@/lib/utils';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * A real keypad rather than a text input. On a phone this is one-thumb work,
 * which is the whole point of the PIN.
 */
export function Keypad({
  onPress,
  disabled,
}: {
  onPress: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KEYS.map((k, i) =>
        k === '' ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onPress(k)}
            className={cn(
              'h-16 rounded-lg border border-white/10 bg-white/5 text-2xl font-display text-[#F7F2E8]',
              'transition active:scale-95 hover:bg-white/10 disabled:opacity-40',
              k === 'del' && 'text-base font-sans text-[#A0947F]',
            )}
          >
            {k === 'del' ? 'Delete' : k}
          </button>
        ),
      )}
    </div>
  );
}

export function PinDots({ length, total = 4 }: { length: number; total?: number }) {
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-3 w-3 rounded-full border transition',
            i < length ? 'border-gold bg-gold' : 'border-white/25 bg-transparent',
          )}
        />
      ))}
    </div>
  );
}
