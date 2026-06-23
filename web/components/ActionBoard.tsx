"use client";
import { useMemo, useState } from "react";
import { ArrowRight, Flag, Search, Circle, CircleDot, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRemoteState } from "./useRemoteState";

const PAGE_SIZE = 6; // cards per column page — paginated, not infinite scroll

export type ActionItem = { id: string; action: string; persona: string; topic: string; prompt: string };
type Status = "backlog" | "doing" | "done";
type State = Record<string, { status: Status; pri: boolean }>;

const COLS: { id: Status; label: string; icon: typeof Circle; accent: string }[] = [
  { id: "backlog", label: "Backlog", icon: Circle, accent: "#8A8A8A" },
  { id: "doing", label: "In progress", icon: CircleDot, accent: "#CA8A04" },
  { id: "done", label: "Done", icon: CheckCircle2, accent: "#22c55e" },
];
const NEXT: Record<Status, Status> = { backlog: "doing", doing: "done", done: "backlog" };

export default function ActionBoard({ actions }: { actions: ActionItem[] }) {
  const [state, setState] = useRemoteState<State>("actions", {});
  const [q, setQ] = useState("");
  const [persona, setPersona] = useState<string>("");
  const [pages, setPages] = useState<Record<Status, number>>({ backlog: 0, doing: 0, done: 0 });
  const setPage = (col: Status, p: number) => setPages((s) => ({ ...s, [col]: p }));

  const personas = useMemo(() => [...new Set(actions.map((a) => a.persona).filter(Boolean))], [actions]);
  const get = (id: string) => state[id] || { status: "backlog" as Status, pri: false };
  const move = (id: string) => setState((s) => ({ ...s, [id]: { ...get(id), status: NEXT[get(id).status] } }));
  const flag = (id: string) => setState((s) => ({ ...s, [id]: { ...get(id), pri: !get(id).pri } }));

  const filtered = actions.filter((a) =>
    (!persona || a.persona === persona) &&
    (!q || a.action.toLowerCase().includes(q.toLowerCase()) || a.prompt.toLowerCase().includes(q.toLowerCase())));

  const byCol = (c: Status) => filtered.filter((a) => get(a.id).status === c)
    .sort((x, y) => Number(get(y.id).pri) - Number(get(x.id).pri));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions…"
            className="ring-brand border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm w-56 bg-white outline-none transition" />
        </div>
        <button onClick={() => setPersona("")} className={`press px-2.5 py-1 rounded-full text-xs font-medium border transition ${!persona ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200"}`}>all</button>
        {personas.map((p) => (
          <button key={p} onClick={() => setPersona(p)} className={`press px-2.5 py-1 rounded-full text-xs font-medium border transition ${persona === p ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:border-brand/40"}`}>{p.toUpperCase()}</button>
        ))}
        <span className="ml-auto text-[11px] text-slate-400">{filtered.length} actions · saved to project</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLS.map((col) => {
          const items = byCol(col.id);
          const Icon = col.icon;
          const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
          const pg = Math.min(pages[col.id], pageCount - 1);
          const shown = items.slice(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE);
          return (
            <div key={col.id} className="rounded-xl bg-slate-50/70 border border-slate-200 p-3 min-h-[200px] flex flex-col">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Icon className="w-4 h-4" style={{ color: col.accent }} />
                <span className="text-[13px] font-semibold text-ink">{col.label}</span>
                <span className="ml-auto text-xs tnum text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">{items.length}</span>
              </div>
              <div className="space-y-2">
                {shown.map((a) => {
                  const st = get(a.id);
                  return (
                    <div key={a.id} className="group bg-white rounded-lg border border-slate-200 p-3 lift">
                      <div className="flex items-start gap-2">
                        <button onClick={() => flag(a.id)} title="Toggle priority"
                          className={`press shrink-0 mt-0.5 ${st.pri ? "text-yellow-600" : "text-slate-300 hover:text-slate-400"}`}>
                          <Flag className="w-3.5 h-3.5" fill={st.pri ? "currentColor" : "none"} />
                        </button>
                        <p className={`text-[13px] leading-snug flex-1 ${st.status === "done" ? "text-slate-400 line-through" : "text-slate-700"}`}>{a.action}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2.5">
                        {a.persona && <span className="text-[10px] uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{a.persona}</span>}
                        {a.topic && <span className="text-[10px] bg-brand-light text-brand px-1.5 py-0.5 rounded truncate max-w-[140px]">{a.topic}</span>}
                        <button onClick={() => move(a.id)} title="Move to next column"
                          className="press ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-brand opacity-0 group-hover:opacity-100 transition">
                          move <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Nothing here.</p>}
              </div>
              {pageCount > 1 && (
                <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <button onClick={() => setPage(col.id, Math.max(0, pg - 1))} disabled={pg === 0}
                    className="press inline-flex items-center gap-0.5 px-2 py-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-default">
                    <ChevronLeft className="w-3.5 h-3.5" />prev
                  </button>
                  <span className="tnum">Page {pg + 1} of {pageCount}</span>
                  <button onClick={() => setPage(col.id, Math.min(pageCount - 1, pg + 1))} disabled={pg >= pageCount - 1}
                    className="press inline-flex items-center gap-0.5 px-2 py-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-default">
                    next<ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
