"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play, Search, BarChart3, ShieldCheck, FileSearch, Calculator, Rocket, Award, BadgeCheck,
  Loader2, Check, X, ChevronDown,
} from "lucide-react";

type Job = { id: string; stage: string; status: "running" | "done" | "error"; startedAt: number; endedAt?: number; exitCode?: number | null; tail?: string };

const STAGES = [
  { cmd: "analyze", icon: BarChart3, label: "Analyze", desc: "Re-derive metrics from collected answers." },
  { cmd: "audit", icon: ShieldCheck, label: "Site audit", desc: "Crawler access, llms.txt, schema." },
  { cmd: "citability", icon: FileSearch, label: "Citability", desc: "Score owned pages." },
  { cmd: "brand", icon: Award, label: "Brand presence", desc: "Off-site entity scan." },
  { cmd: "eeat", icon: BadgeCheck, label: "E-E-A-T", desc: "Content trust scan (LLM)." },
  { cmd: "compose", icon: Calculator, label: "Compose score", desc: "Composite GEO + issues." },
  { cmd: "comp-profile", icon: BadgeCheck, label: "Competitor profiles", desc: "Logos, descriptions, GEO scores per competitor." },
  { cmd: "prompts", icon: Search, label: "Build prompts", desc: "Regenerate the prompt library." },
  { cmd: "full", icon: Rocket, label: "Full pipeline", desc: "Everything, dependency-ordered.", primary: true },
];

export default function RunTriggers() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await (await fetch("/api/runs")).json();
      if (d?.ok) setJobs(d.jobs);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    refresh();
    poll.current = setInterval(refresh, 2500);
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [refresh]);

  const running = jobs.find((j) => j.status === "running");
  const run = async (stage: string) => {
    setErr("");
    const r = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d?.error || "could not start run"); return; }
    refresh();
  };

  const dur = (j: Job) => j.endedAt ? `${Math.max(1, Math.round((j.endedAt - j.startedAt) / 1000))}s` : "running…";

  return (
    <div className="space-y-4">
      {err && <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2 flex items-center gap-2"><X className="w-4 h-4" />{err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STAGES.map((s) => {
          const active = running?.stage === s.cmd;
          return (
            <button key={s.cmd} onClick={() => run(s.cmd)} disabled={!!running}
              className={`press ring-brand text-left rounded-xl border p-4 transition disabled:opacity-50 ${s.primary ? "border-brand/30 bg-brand-light/50 hover:bg-brand-light" : "border-slate-200 bg-white hover:border-brand/40"}`}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className={`w-8 h-8 rounded-lg grid place-items-center ${s.primary ? "bg-brand text-white" : "bg-brand-light text-brand"}`}>
                  {active ? <Loader2 className="w-4 h-4 animate-spin" /> : <s.icon className="w-4 h-4" />}
                </span>
                <span className="text-sm font-semibold text-ink">{s.label}</span>
                <Play className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{s.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">Job log</span>
          {running && <span className="text-[11px] text-yellow-600 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{running.stage} running</span>}
          <span className="ml-auto text-[11px] text-slate-400">{jobs.length} jobs · auto-refresh</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-[320px] overflow-auto scroll">
          {jobs.map((j) => (
            <div key={j.id}>
              <button onClick={() => setOpen(open === j.id ? null : j.id)} className="press w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
                <span className={`w-6 h-6 rounded-md grid place-items-center shrink-0 ${j.status === "done" ? "bg-emerald-50 text-emerald-600" : j.status === "error" ? "bg-red-50 text-red-600" : "bg-brand-light text-brand"}`}>
                  {j.status === "done" ? <Check className="w-3.5 h-3.5" /> : j.status === "error" ? <X className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                </span>
                <span className="text-sm font-medium text-slate-700 w-28">python run.py {j.stage}</span>
                <span className="text-[11px] text-slate-400">{dur(j)}</span>
                <ChevronDown className={`w-4 h-4 text-slate-300 ml-auto transition ${open === j.id ? "rotate-180" : ""}`} />
              </button>
              {open === j.id && (
                <pre className="text-[11px] leading-relaxed font-mono bg-slate-900 text-slate-100 mx-4 mb-3 rounded-lg p-3 overflow-auto scroll max-h-48 whitespace-pre-wrap">{j.tail || "(no output captured)"}</pre>
              )}
            </div>
          ))}
          {jobs.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No runs yet. Trigger a stage above.</p>}
        </div>
      </div>
    </div>
  );
}
