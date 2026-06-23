"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X, Clock } from "lucide-react";
import { parseFilters, toQuery, activeCount, type Filters, type Mentioned } from "@/lib/filters";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors"
      style={active
        ? { background: "#1F1F1F", color: "#FFFFFF", borderColor: "#1F1F1F" }
        : { background: "#FFFFFF", color: "#3D3D3D", borderColor: "#D6D6D6" }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F5F5F5"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; }}>
      {children}
    </button>
  );
}

export default function GlobalControls({ lastRun }: { personas?: string[]; intents?: string[]; lastRun?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const f = parseFilters(Object.fromEntries(sp.entries()));
  const [q, setQ] = useState(f.q);
  useEffect(() => setQ(f.q), [f.q]);

  const push = (next: Partial<Filters>) => {
    const merged = { ...f, ...next };
    router.replace(`${pathname}${toQuery(merged)}`, { scroll: false });
  };
  const n = activeCount(f);

  return (
    <div className="bg-white shrink-0 py-2.5" style={{ borderBottom: "1px solid #E6E6E6" }}>
      <div className="mx-auto max-w-[1400px] px-6 flex flex-wrap items-center gap-2">
        {/* search */}
        <form onSubmit={(e) => { e.preventDefault(); push({ q }); }} className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8A8A8A" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts..."
            className="rounded-lg pr-3 py-1.5 text-[13px] w-56 outline-none transition-colors"
            style={{ paddingLeft: "2.1rem", border: "1px solid #D6D6D6", color: "#0F0F0F" }}
            onFocus={(e) => (e.target.style.borderColor = "#0056D6")}
            onBlur={(e) => (e.target.style.borderColor = "#D6D6D6")} />
        </form>

        <span className="text-[11px] font-semibold ml-1" style={{ color: "#8A8A8A" }}>Show</span>
        {(["all", "yes", "no"] as Mentioned[]).map((v) => (
          <Chip key={v} active={f.mentioned === v} onClick={() => push({ mentioned: v })}>
            {v === "all" ? "all prompts" : v === "yes" ? "where we appear" : "where we're missing"}
          </Chip>
        ))}

        {n > 0 && (
          <button onClick={() => router.replace(pathname, { scroll: false })}
            className="inline-flex items-center gap-1 text-[12px] font-semibold ml-0.5 px-2 py-1 rounded-lg transition-colors"
            style={{ color: "#0056D6" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#EBF2FF")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}>
            <X className="w-3 h-3" />clear ({n})
          </button>
        )}

        {lastRun && (
          <div className="ml-auto inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap" style={{ color: "#8A8A8A" }}>
            <Clock className="w-3.5 h-3.5" />Last run
            <span className="font-semibold" style={{ color: "#5C5C5C" }}>{lastRun}</span>
          </div>
        )}
      </div>
    </div>
  );
}
