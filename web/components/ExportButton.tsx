"use client";
import { useState } from "react";
import { Download, Check } from "lucide-react";

// Client-side CSV export — no server round-trip. Pass plain row objects.
export default function ExportButton<T extends Record<string, unknown>>({
  rows, filename, label = "Export CSV",
}: { rows: T[]; filename: string; label?: string }) {
  const [done, setDone] = useState(false);

  const onClick = () => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };

  return (
    <button onClick={onClick} disabled={!rows.length}
      className="press ring-brand inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:border-brand/40 hover:text-ink px-2.5 py-1.5 rounded-lg transition disabled:opacity-40">
      {done ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
      {done ? "Downloaded" : label}
    </button>
  );
}
