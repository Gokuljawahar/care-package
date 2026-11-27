import { useEffect, useRef, useState } from 'react';

/** Largest square that fits inside the observed box. */
export const useSquare = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize(Math.floor(Math.min(width, height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
};
