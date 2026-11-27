import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

/** "HH:MM:SS" until the timestamp, ticking every second. */
export const useCountdown = (target: number): string => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((target - now) / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};
