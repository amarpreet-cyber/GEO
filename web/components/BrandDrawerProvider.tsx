"use client";
// One drawer for "show me the prompts behind this metric." Open it with a field+value
// (a brand, persona, intent, sentiment, or topic) and it lists the matching prompts;
// each drills into the in-context prompt analysis. Mounted once in the layout.
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Drawer } from "@/components/Drawer";
import { Badge } from "@/components/ui";
import { usePromptDrawer } from "@/components/PromptDrawerProvider";

type Seg = { field: string; value: string; label?: string };
const Ctx = createContext<{ open: (field: string, value: string, label?: string) => void }>({ open: () => {} });
export function useSegmentDrawer() { return useContext(Ctx); }

type Row = { idx: number; prompt: string; persona: string; intent: string; position: number; mentioned: boolean };
type VM = { field: string; value: string; isBrand: boolean; count: number; prompts: Row[] };

export function BrandDrawerProvider({ children }: { children: ReactNode }) {
  const [seg, setSeg] = useState<Seg | null>(null);
  const [vm, setVm] = useState<VM | null>(null);
  const [loading, setLoading] = useState(false);
  const { open: openPrompt } = usePromptDrawer();
  const open = useCallback((field: string, value: string, label?: string) => setSeg({ field, value, label }), []);

  useEffect(() => {
    if (!seg) return;
    setLoading(true); setVm(null);
    fetch(`/api/prompts/by?field=${encodeURIComponent(seg.field)}&value=${encodeURIComponent(seg.value)}`)
      .then((r) => r.json()).then((d) => { if (!d.error) setVm(d); }).catch(() => {}).finally(() => setLoading(false));
  }, [seg]);

  const title = seg?.label || seg?.value || "";
  const isCited = seg?.field === "cited";
  const noun = vm?.isBrand ? "RISA appears" : seg?.field === "name" ? `${seg.value} is mentioned`
    : isCited ? `${seg?.value} is cited` : `match "${title}"`;

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Drawer open={seg != null} onOpenChange={(v) => { if (!v) { setSeg(null); setVm(null); } }}
        title={<span className="inline-flex items-center gap-2">{title}{vm?.isBrand && <Badge variant="brand">RISA</Badge>}</span>}
        subtitle={vm ? `${vm.count} prompt${vm.count === 1 ? "" : "s"} where ${noun}` : (loading ? "Loading…" : undefined)}>
        {/* exact source link for a cited domain */}
        {isCited && seg && (
          <a href={`https://${seg.value}`} target="_blank" rel="noopener noreferrer"
            className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-brand hover:bg-brand-light/40 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Visit {seg.value}
          </a>
        )}
        {loading && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>}
        {vm && vm.prompts.length === 0 && <p className="text-[13px] text-slate-400">No prompts here in the current run.</p>}
        {vm && vm.prompts.length > 0 && (
          <>
            {isCited && (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Answers that cited this source</div>
            )}
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-200 overflow-hidden">
              {vm.prompts.map((p) => (
                <button key={p.idx} onClick={() => openPrompt(p.idx)} className="block w-full text-left">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-slate-700 truncate">{p.prompt}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {(p.persona || "").toUpperCase()}{p.intent ? " · " + p.intent : ""}
                      </div>
                    </div>
                    {p.mentioned
                      ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-brand-light text-brand">RISA{p.position > 0 ? ` #${p.position}` : ""}</span>
                      : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-slate-100 text-slate-400">no RISA</span>}
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Drawer>
    </Ctx.Provider>
  );
}

// Clickable wrapper: open the prompts behind a brand row (Share of Voice / leaderboards).
export function BrandTrigger({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  const { open } = useSegmentDrawer();
  return <button type="button" onClick={() => open("name", name, name)} className={className}>{children}</button>;
}
