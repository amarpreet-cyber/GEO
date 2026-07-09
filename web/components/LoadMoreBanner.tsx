"use client";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { useState } from "react";

export default function LoadMoreBanner({ promptCount }: { promptCount: number }) {
  const [loading, setLoading] = useState(false);
  const [queued, setQueued] = useState(false);

  const trigger = async () => {
    setLoading(true);
    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "full" }),
    }).catch(() => {});
    setLoading(false);
    setQueued(true);
  };

  if (queued) return (
    <div className="mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 no-print"
      style={{ background: "#f0fdf4", borderColor: "#16a34a33" }}>
      <span className="text-[13px] text-emerald-700 font-semibold">Full pipeline queued.</span>
      <span className="text-[13px] text-slate-500 flex-1">
        Check progress in <Link href="/settings/runs" className="underline text-brand">Settings → Runs</Link>.
      </span>
    </div>
  );

  return (
    <div className="mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 no-print"
      style={{ background: "#fffbeb", borderColor: "#d9770633" }}>
      <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 bg-yellow-500">
        <TrendingUp className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 text-[13px] text-slate-700">
        <span className="font-semibold text-slate-800">Preview mode</span>
        <span className="text-slate-500 ml-2">
          Showing {promptCount} of 246 prompts. Run the full pipeline for complete visibility metrics.
        </span>
      </div>
      <button onClick={trigger} disabled={loading}
        className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: "#0056D6" }}>
        {loading ? "Queuing..." : "Run all 246 prompts →"}
      </button>
    </div>
  );
}
