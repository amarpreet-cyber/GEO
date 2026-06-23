"use client";
import { usePathname } from "next/navigation";

// Re-mounts on every route change so the content area rises + fades in fresh.
// One place, global — every page inherits the transition without per-page code.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-rise">
      {children}
    </div>
  );
}
