import Link from "next/link";

// Keelson mark: a hull section with the keelson bolted over the keel.
export function KeelMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 9 L29 9 L22 26 Q16 29 10 26 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="12.5" y="17" width="7" height="4.5" fill="currentColor" />
      <path d="M16 26.5 V30" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

export default function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="Keelson home">
      <KeelMark />
      Keelson
    </Link>
  );
}
