export function ArchMark({ className = 'h-8 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true">
      <path d="M10 78 L10 40 A50 50 0 0 1 110 40 L110 78" fill="none" stroke="currentColor" strokeWidth={5} />
      <path d="M32 78 L32 44 A28 28 0 0 1 88 44 L88 78" fill="none" stroke="currentColor" strokeWidth={4} opacity={0.55} />
    </svg>
  );
}
