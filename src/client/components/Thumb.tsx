/** The player's thumbprint marker, positioned in % of the picture. */
export const Thumb = ({
  x,
  y,
  pulse,
}: {
  x: number;
  y: number;
  pulse: boolean;
}) => (
  <div
    className="thumb pointer-events-none absolute"
    data-pulse={pulse}
    style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 24 24" width="28" height="28">
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="#fff8ee"
        stroke="#1b1210"
        strokeWidth="1.5"
      />
      <g fill="none" stroke="#ff2e93" strokeWidth="1.6" strokeLinecap="round">
        <path d="M7.5 15.5c-.6-1.1-.9-2.3-.9-3.5a5.4 5.4 0 0 1 10.8 0c0 1.5-.3 2.9-.9 4.2" />
        <path d="M9.7 17.4c-.5-1.6-.8-3.3-.8-5.4a3.1 3.1 0 0 1 6.2 0c0 1.9-.2 3.6-.7 5.2" />
        <path d="M12 12c0 2.3.2 4.2.6 6" />
      </g>
    </svg>
  </div>
);
