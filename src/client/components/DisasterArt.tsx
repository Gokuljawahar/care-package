import type { DisasterId } from '../../shared/game';

type Props = {
  variant: DisasterId | 'unknown';
  size?: number;
};

export const DisasterArt = ({ variant, size = 44 }: Props) => {
  if (variant === 'blackout') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#ffd23f" fillOpacity="0.16" />
        <path
          d="M27 7L14 26h10l-3 15 14-20H25l2-14Z"
          fill="#ffd23f"
          stroke="#17120e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M10 14l4 4m20-4l-4 4"
          stroke="#ffd23f"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  }

  if (variant === 'zombie') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#4ade80" fillOpacity="0.16" />
        <path
          d="M12 38V23l3-7 3 7v6l3-9 3 9v5l3-10 3 10v4l3-6 2 6v6Z"
          fill="#4ade80"
        />
        <path
          d="M8 31h32M11 26l4-2m18 0l4 2"
          stroke="#17120e"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (variant === 'nuclear') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#60a5fa" fillOpacity="0.16" />
        <circle cx="24" cy="24" r="4" fill="#60a5fa" />
        <path
          d="M24 17l-7-10a16 16 0 0 1 14 0l-7 10Zm-6 10l-11 1a16 16 0 0 0 7 12l4-13Zm12 0l4 13a16 16 0 0 0 7-12l-11-1Z"
          fill="#60a5fa"
        />
      </svg>
    );
  }

  if (variant === 'civil_war') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#fb7185" fillOpacity="0.16" />
        <path
          d="M12 35L32 15m4-4l-4 4m-16 0l20 20m-24 0l4-4"
          stroke="#fb7185"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M9 38h30"
          stroke="#fb7185"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  }

  if (variant === 'ai_uprising') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#c084fc" fillOpacity="0.16" />
        <rect
          x="10"
          y="16"
          width="28"
          height="16"
          rx="8"
          fill="none"
          stroke="#c084fc"
          strokeWidth="2.8"
        />
        <circle cx="24" cy="24" r="4.5" fill="#fb5a6b" />
        <path
          d="M16 11l3 5m13-5l-3 5M14 37l20-3"
          stroke="#c084fc"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke="#ffbe3b"
        strokeWidth="2"
        className="radar-pulse"
      />
      <path
        d="M14 32a12 12 0 0 1 18-16l-8 10 10 4"
        fill="none"
        stroke="#ffbe3b"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="26" r="3" fill="#ffbe3b" />
    </svg>
  );
};
