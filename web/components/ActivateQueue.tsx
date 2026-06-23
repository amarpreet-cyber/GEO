"use client";
import { Zap, Send, Check, Inbox, Swords, FileText, Quote, Trash2 } from "lucide-react";
import { useRemoteState } from "./useRemoteState";

export type Insight = {
  id: string; kind: "competitor_win" | "content_gap" | "citation_gap";
  title: string; detail: string; target: "rizza" | "hubspot"; action: string;
};
type Queued = Insight & { status: "queued" | "dispatched"; at: number };

const KIND: Record<Insight["kind"], { label: string; icon: typeof Swords; color: string }> = {
  competitor_win: { label: "Competitor win", icon: Swords, color: "#ef4444" },
  content_gap: { label: "Content gap", icon: FileText, color: "#CA8A04" },
  citation_gap: { label: "Citation gap", icon: Quote, color: "#3b82f6" },
};
const TARGET: Record<Insight["target"], string> = { rizza: "RizzA", hubspot: "HubSpot" };

export default function ActivateQueue({ insights }: { insights: Insight[] }) {
  const [queue, setQueue] = useRemoteState<Queued[]>("activate", []);

  const queuedIds = new Set(queue.map((q) => q.id));
  const enqueue = (i: Insight) => { if (!queuedIds.has(i.id)) setQueue((q) => [{ ...i, status: "queued", at: Date.now() }, ...q]); };
  const dispatch = (id: string) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, status: "dispatched" } : x)));
  const dispatchAll = () => setQueue((q) => q.map((x) => ({ ...x, status: "dispatched" })));
  const remove = (id: string) => setQueue((q) => q.filter((x) => x.id !== id));

  return (
    <div className="grid grid-cols-12 gap-5">
      {/* available insights */}
      <div className="col-span-12 lg:col-span-7 space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1 px-1">Available signals · {insights.length}</div>
        {insights.map((i) => {
          const k = KIND[i.kind];
          const Icon = k.icon;
          const on = queuedIds.has(i.id);
          return (
            <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-4 lift">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: k.color + "18", color: k.color }}><Icon className="w-4 h-4" /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: k.color }}>{k.label}</span>
                    <span className="text-[10px] text-slate-400">→ {TARGET[i.target]}</span>
                  </div>
                  <div className="text-sm font-medium text-ink leading-snug mt-0.5">{i.title}</div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{i.detail}</p>
                </div>
                <button onClick={() => enqueue(i)} disabled={on}
                  className={`press ring-brand shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${on ? "bg-slate-100 text-slate-400" : "bg-brand text-white hover:bg-brand-dark"}`}>
                  {on ? <><Check className="w-3.5 h-3.5" /> queued</> : <><Zap className="w-3.5 h-3.5" /> activate</>}
                </button>
              </div>
            </div>
          );
        })}
        {insights.length === 0 && <p className="text-sm text-slate-400 p-4">No live signals to activate right now.</p>}
      </div>

      {/* dispatch queue */}
      <div className="col-span-12 lg:col-span-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-20">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="w-4 h-4 text-brand" />
            <span className="text-[13px] font-semibold text-ink">Dispatch queue</span>
            <span className="ml-auto text-xs tnum text-slate-400">{queue.length}</span>
          </div>
          {queue.length > 0 && (
            <button onClick={dispatchAll} className="press w-full mb-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-brand hover:bg-brand-dark rounded-lg py-2 transition">
              <Send className="w-3.5 h-3.5" /> Dispatch all (stubbed adapters)
            </button>
          )}
          <div className="space-y-2 max-h-[460px] overflow-auto scroll">
            {queue.map((q) => {
              const k = KIND[q.kind];
              return (
                <div key={q.id} className="group rounded-lg border border-slate-200 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: q.status === "dispatched" ? "#22c55e" : k.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700 leading-snug">{q.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{k.label} → {TARGET[q.target]} · {q.action}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {q.status === "queued"
                        ? <button onClick={() => dispatch(q.id)} className="press text-[10px] font-medium text-brand hover:bg-brand-light px-1.5 py-1 rounded">send</button>
                        : <span className="text-[10px] font-medium text-emerald-600 inline-flex items-center gap-0.5"><Check className="w-3 h-3" />sent</span>}
                      <button onClick={() => remove(q.id)} className="press text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {queue.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Activate a signal to queue an outbound action.</p>}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            Adapters are stubbed — dispatch returns <code>{`{ ok: true, stubbed: true }`}</code>. Wiring the real RizzA / HubSpot calls needs no UI change.
          </p>
        </div>
      </div>
    </div>
  );
}
