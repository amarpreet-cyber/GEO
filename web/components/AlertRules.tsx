"use client";
import { Bell, BellOff, TriangleAlert, CheckCircle2 } from "lucide-react";
import { useRemoteState } from "./useRemoteState";

export type Metric = { key: string; label: string; value: number; unit: string };
type Rule = { key: string; threshold: number; enabled: boolean };

const DEFAULTS: Record<string, number> = {
  geo_score: 50, visibility: 15, sov: 12, readiness: 60, schema: 40, mention: 10,
};

export default function AlertRules({ metrics }: { metrics: Metric[] }) {
  const [rules, setRules] = useRemoteState<Record<string, Rule>>("alerts", {});
  const ruleFor = (key: string): Rule => rules[key] || { key, threshold: DEFAULTS[key] ?? 50, enabled: true };

  const fired = metrics.filter((m) => ruleFor(m.key).enabled && m.value < ruleFor(m.key).threshold);

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${fired.length ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
        {fired.length
          ? <><TriangleAlert className="w-5 h-5 text-red-500" /><span className="text-sm font-medium text-red-700">{fired.length} alert{fired.length > 1 ? "s" : ""} firing — {fired.map((f) => f.label).join(", ")}</span></>
          : <><CheckCircle2 className="w-5 h-5 text-emerald-600" /><span className="text-sm font-medium text-emerald-700">All clear. Every enabled metric is above its threshold.</span></>}
      </div>

      <div className="space-y-2">
        {metrics.map((m) => {
          const r = ruleFor(m.key);
          const isFired = r.enabled && m.value < r.threshold;
          return (
            <div key={m.key} className={`rounded-xl border p-4 transition ${isFired ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-4 flex-wrap">
                <button onClick={() => setRules((s) => ({ ...s, [m.key]: { ...r, enabled: !r.enabled } }))}
                  className={`press shrink-0 w-9 h-9 rounded-lg grid place-items-center transition ${r.enabled ? "bg-brand-light text-brand" : "bg-slate-100 text-slate-400"}`}>
                  {r.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{m.label}</div>
                  <div className="text-[11px] text-slate-400">alert when below threshold</div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">current</div>
                    <div className={`text-lg font-semibold tnum ${isFired ? "text-red-600" : "text-ink"}`}>{m.value.toFixed(1)}<span className="text-xs text-slate-300">{m.unit}</span></div>
                  </div>
                  <span className="text-slate-300">{"<"}</span>
                  <input type="number" value={r.threshold}
                    onChange={(e) => setRules((s) => ({ ...s, [m.key]: { ...r, threshold: Number(e.target.value) } }))}
                    className="ring-brand w-20 text-center tnum text-sm border border-slate-200 rounded-lg py-1.5 outline-none bg-white" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full meter-fill" style={{ width: `${Math.min(100, m.value)}%`, background: isFired ? "#ef4444" : "#22c55e" }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">Rules persist to the project state and evaluate against the latest run. Move to on-snapshot server evaluation by calling this from the run job.</p>
    </div>
  );
}
