import { useLayoutEffect, useRef, useState } from 'react';

/** Mide un elemento y se actualiza cuando cambia su tamaño (ResizeObserver). */
export function useElementSize<T extends HTMLElement>(fallbackWidth = 640) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: fallbackWidth, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((s) =>
        Math.round(r.width) === s.width && Math.round(r.height) === s.height
          ? s
          : { width: Math.round(r.width), height: Math.round(r.height) },
      );
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
