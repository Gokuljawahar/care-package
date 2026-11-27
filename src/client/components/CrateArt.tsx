import type { CrateScanStatus } from '../../shared/game';

export type CrateVisualState =
  | 'sealed'
  | 'opening'
  | 'opened_real'
  | 'opened_trojan';

type Props = {
  state: CrateVisualState;
  scanStatus?: CrateScanStatus;
  size?: number;
};

export const CrateArt = ({
  state,
  scanStatus = 'unscanned',
  size = 76,
}: Props) => {
  if (state === 'opened_real') {
    return (
      <svg
        viewBox="0 0 96 80"
        width={size * 1.2}
        height={size}
        className="crate-burst"
        aria-hidden="true"
      >
        <path
          d="M48 6l4 14m-24-8l9 12m31-12l-9 12M16 26l14 4m50-4l-14 4"
          stroke="#ffd23f"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <rect
          x="22"
          y="34"
          width="52"
          height="36"
          rx="6"
          fill="#2f241c"
          stroke="#4ade80"
          strokeWidth="3"
        />
        <path
          d="M18 34l10-12h40l10 12"
          fill="#3f3126"
          stroke="#4ade80"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M48 40v24M36 52h24"
          stroke="#4ade80"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (state === 'opened_trojan') {
    return (
      <svg
        viewBox="0 0 96 80"
        width={size * 1.2}
        height={size}
        className="crate-trojan-pop"
        aria-hidden="true"
      >
        <circle cx="48" cy="36" r="32" fill="#fb5a6b" fillOpacity="0.22" />
        <rect
          x="22"
          y="38"
          width="52"
          height="34"
          rx="6"
          fill="#2d171a"
          stroke="#fb5a6b"
          strokeWidth="3"
        />
        <path
          d="M36 38V20l4-8 4 8v6l4-10 4 10v6l4-9 4 9v16Z"
          fill="#4ade80"
          stroke="#17120e"
          strokeWidth="2"
        />
        <path
          d="M22 46l16 8 10-6 12 8 14-8"
          fill="none"
          stroke="#fb5a6b"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const trim =
    scanStatus === 'real'
      ? '#4ade80'
      : scanStatus === 'trojan'
        ? '#fb5a6b'
        : '#ffbe3b';

  return (
    <svg
      viewBox="0 0 96 80"
      width={size * 1.2}
      height={size}
      className={state === 'opening' ? 'crate-shake' : ''}
      aria-hidden="true"
    >
      <rect
        x="20"
        y="16"
        width="56"
        height="52"
        rx="8"
        fill="#362921"
        stroke={trim}
        strokeWidth="3"
      />
      <path d="M20 31h56M48 16v52" stroke={trim} strokeWidth="2.6" />
      <rect
        x="41"
        y="26"
        width="14"
        height="10"
        rx="3"
        fill="#17120e"
        stroke={trim}
        strokeWidth="2"
      />
      <circle cx="27" cy="23" r="2" fill={trim} />
      <circle cx="69" cy="23" r="2" fill={trim} />
      <circle cx="27" cy="61" r="2" fill={trim} />
      <circle cx="69" cy="61" r="2" fill={trim} />
    </svg>
  );
};
