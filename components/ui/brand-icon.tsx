export function BrandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 8 5 12l4 4" />
      <path d="M14 6 11 18" />
      <path d="m15 8 4 4-4 4" />
    </svg>
  );
}
