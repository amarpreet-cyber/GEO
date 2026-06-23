"use client";
// Level-3 in-context prompt analysis. Opens layered over a drill-down drawer (or anywhere)
// and fetches a single prompt's full analysis from /api/prompts/[id] — so a user goes
// metric → breakdown → this prompt's answer/sentiment/competitors/citations/actions
// without ever leaving the page.
import { useEffect, useState } from "react";
import { FileText, MapPin, Globe, Building2, Zap, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Drawer } from "@/components/Drawer";
import { Badge, ClassTag, SentPill, MeterBar } from "@/components/ui";

const CLASS_COLOR: Record<string, string> = { owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C" };

type VM = {
  id: number; prompt: string; persona: string; intent: string; topic: string; engine: string;
  mentioned: boolean; position: number; sentiment: string; competitors: string[];
  domainsByClass: Record<string, string[]>; citeCount: number; actions: string[];
  answer_summary: string; response: string;
};

function MiniStat({ icon, label, value, tone, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string; sub?: string }) {
  const c = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-500" : tone === "warn" ? "text-yellow-600" : "text-ink";
  return (
    <div className="ds-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>{label}
      </div>
      <div className={`text-[20px] font-bold tnum leading-none mt-1.5 ${c}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1 truncate">{sub}</div>}
    </div>
  );
}

export function PromptDrawer({ id, open, onOpenChange }: { id: number | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [vm, setVm] = useState<VM | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id == null || !open) return;
    setLoading(true); setVm(null);
    fetch(`/api/prompts/${id}`).then((r) => r.json()).then((d) => { if (!d.error) setVm(d); }).catch(() => {}).finally(() => setLoading(false));
  }, [id, open]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} size="lg"
      title="Prompt analysis"
      subtitle={vm?.prompt || (loading ? "Loading…" : undefined)}
      footer={id != null && (
        <Link href={`/prompts/${id}`} onClick={() => onOpenChange(false)}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline">
          Open as full page <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      )}>
      {loading && (
        <div className="space-y-3">
          <div className="h-16 skeleton rounded-lg" />
          <div className="h-24 skeleton rounded-lg" />
          <div className="h-48 skeleton rounded-lg" />
        </div>
      )}

      {vm && (
        <div className="space-y-5">
          {/* tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{vm.persona?.toUpperCase() || "—"}</Badge>
            <Badge variant="brand">{vm.intent || "—"}</Badge>
            {vm.topic && <Badge variant="neutral">{vm.topic}</Badge>}
            <Badge variant="neutral">{vm.engine}</Badge>
            <SentPill label={vm.sentiment} />
          </div>

          {/* signal */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat icon={<FileText className="w-3.5 h-3.5" />} label="Mentioned" value={vm.mentioned ? "Yes" : "No"}
              tone={vm.mentioned ? "good" : "bad"} sub={vm.mentioned ? "RISA named" : "RISA absent"} />
            <MiniStat icon={<MapPin className="w-3.5 h-3.5" />} label="Position" value={vm.position > 0 ? `#${vm.position}` : "—"}
              tone={vm.position === 1 ? "good" : vm.position > 0 ? "warn" : "bad"} sub={vm.position > 0 ? "in answer" : "not ranked"} />
            <MiniStat icon={<Globe className="w-3.5 h-3.5" />} label="Cited domains" value={vm.citeCount}
              sub={`${Object.keys(vm.domainsByClass).length} class types`} />
            <MiniStat icon={<Building2 className="w-3.5 h-3.5" />} label="Competitors" value={vm.competitors.length}
              tone={vm.competitors.length > 2 ? "bad" : vm.competitors.length ? "warn" : "good"}
              sub={vm.competitors.length ? vm.competitors.slice(0, 2).join(", ") : "none named"} />
          </div>

          {/* competitors */}
          {vm.competitors.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Competitors named ({vm.competitors.length})</div>
              <div className="flex flex-wrap gap-1.5">{vm.competitors.map((c) => <Badge key={c} variant="competitor">{c}</Badge>)}</div>
            </div>
          )}

          {/* cited domains */}
          {vm.citeCount > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Cited sources ({vm.citeCount})</div>
              <div className="space-y-2.5">
                {Object.entries(vm.domainsByClass).map(([cls, doms]) => (
                  <div key={cls}>
                    <div className="mb-1.5"><ClassTag k={cls} /></div>
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {doms.map((d) => (
                        <a key={d} href={`https://${d}`} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] px-2 py-0.5 rounded inline-flex items-center gap-1 hover:underline"
                          style={{ background: (CLASS_COLOR[cls] || "#8A8A8A") + "18", color: "#3D3D3D" }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CLASS_COLOR[cls] || "#8A8A8A" }} />
                          {d}<ArrowUpRight className="w-2.5 h-2.5 opacity-50" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* recommended actions */}
          {vm.actions.length > 0 && (
            <div className="ds-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-slate-800 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-600" />Recommended actions</span>
                <Badge variant="warn">{vm.actions.length}</Badge>
              </div>
              <ul className="space-y-2">
                {vm.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                    <span className="w-5 h-5 rounded grid place-items-center bg-brand-light text-brand text-[11px] font-semibold shrink-0 mt-0.5">{i + 1}</span>{a}
                  </li>
                ))}
              </ul>
              {!vm.mentioned && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <MeterBar pct={Math.min(100, 20 * vm.actions.length)} color="#CA8A04" />
                  <p className="text-[11px] text-slate-400 mt-1.5">{vm.actions.length} action{vm.actions.length > 1 ? "s" : ""} to earn this mention</p>
                </div>
              )}
            </div>
          )}

          {/* engine answer */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Engine answer</div>
            {vm.answer_summary && (
              <div className="mb-2 p-3 bg-brand-light rounded-lg border border-brand/10">
                <div className="text-[10px] uppercase tracking-wide text-brand font-semibold mb-1">Summary</div>
                <p className="text-[13px] text-slate-700 leading-relaxed">{vm.answer_summary}</p>
              </div>
            )}
            <div className="text-[13px] text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 leading-relaxed">
              {vm.response || "(no answer text captured)"}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
