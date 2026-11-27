/** Wordmark: the thumbprint glyph + name. */
export const Logo = () => (
  <div className="flex flex-col items-center">
    <svg viewBox="0 0 64 64" width="76" height="76" aria-hidden="true" className="logo-glyph">
      <circle cx="32" cy="32" r="30" fill="#ff2e93" />
      <g fill="none" stroke="#1b1210" strokeWidth="3.4" strokeLinecap="round">
        <path d="M17 41c-1.5-3-2.3-6.2-2.3-9.5a17.3 17.3 0 0 1 34.6 0c0 4.6-.8 8.8-2.4 12.6" />
        <path d="M23.5 46.5c-1.6-4.6-2.4-9.4-2.4-15a10.9 10.9 0 0 1 21.8 0c0 5.4-.6 10.2-1.9 14.9" />
        <path d="M32 31.5c0 6.4.6 12 1.9 17.3" />
        <path d="M27.5 19.8a12.6 12.6 0 0 1 4.5-.8" />
      </g>
    </svg>
    <h1 className="mt-2 font-display text-[44px] leading-none font-bold tracking-tight">Thumbprint</h1>
  </div>
);
