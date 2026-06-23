"use client";
// Thin top loading bar that flashes on route change. Adopted from RISA Outreach.
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function RouteProgress() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [key, setKey] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setKey((k) => k + 1);
    setShow(true);
    const t = setTimeout(() => setShow(false), 600);
    return () => clearTimeout(t);
  }, [pathname, sp]);

  if (!show) return null;
  return <div key={key} className="route-progress no-print" />;
}
