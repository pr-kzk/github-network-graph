export function Spinner({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin ${className}`}
    />
  );
}
