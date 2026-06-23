"use client";
// Animates a number from 0 → value once on first paint (~600ms ease-out).
// Honors prefers-reduced-motion. Supports decimals via `decimals`.
import { useEffect, useRef, useState } from "react";

export function CountUp({
  value, decimals = 0, prefix = "", suffix = "", className,
}: { value: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const [n, setN] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !isFinite(value) || value === 0) { setN(value || 0); return; }
    const start = performance.now();
    const dur = 600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(value * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setN(value);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  const formatted = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}
