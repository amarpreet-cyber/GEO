"use client";
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ChevronDown, ArrowRight } from "lucide-react";

type Job = {
  id: string; stage: string; status: "running" | "done" | "error";
  startedAt: number; endedAt?: number; tail?: string; runId?: string;
};

const STAGE_LABELS: Record<string, string> = {
  prompts:      "Building prompts from your keywords",
  collect:      "Running prompts through Claude",
  analyze:      "Analyzing visibility & share of voice",
  audit:        "Auditing RISA's site readiness",
  citability:   "Scoring page citability",
  brand:        "Checking brand authority",
  eeat:         "Scoring E-E-A-T",
  compose:      "Composing GEO score",
  "comp-profile": "Profiling competitors",
};
const STAGE_ORDER = Object.keys(STAGE_LABELS);

function elapsed(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function LoadingContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const targetJobId = sp.get("jobId");

  const [job, setJob] = useState<Job | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const doneRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/runs");
        const data = await res.json();
        if (!data.ok) return;
        const jobs: Job[] = data.jobs;
        const target = targetJobId ? jobs.find((j) => j.id === targetJobId) : jobs[0];
        if (!target) return;
        setJob(target);
        if ((target.status === "done" || target.status === "error") && !doneRef.current) {
          doneRef.current = true;
          if (pollRef.current) clearInterval(pollRef.current);
          if (target.status === "done") {
            setRedirecting(true);
            setTimeout(() => router.push("/report"), 2200);
          }
        }
      } catch { /* noop */ }
    };
    poll();
    pollRef.current = setInterval(poll, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [targetJobId, router]);

  const isDone = job?.status === "done";
  const isError = job?.status === "error";
  const isRunning = job?.status === "running";
  const runMs = job ? ((isDone || isError ? job.endedAt || now : now) - job.startedAt) : 0;

  const activeStage = (() => {
    if (!job?.tail) return STAGE_ORDER[0];
    for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
      if (job.tail.includes(`[${STAGE_ORDER[i]}]`) || job.tail.includes(STAGE_ORDER[i])) return STAGE_ORDER[i];
    }
    return STAGE_ORDER[0];
  })();

  const activeIdx = STAGE_ORDER.indexOf(activeStage);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-lg">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-full grid place-items-center ${isDone ? "bg-emerald-50" : isError ? "bg-red-50" : "bg-blue-50"}`}>
            {isDone ? <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              : isError ? <XCircle className="w-9 h-9 text-red-400" />
              : <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />}
          </div>
        </div>

        <h1 className="text-[22px] font-semibold text-slate-900 text-center mb-2">
          {isDone ? "Your data is ready" : isError ? "Something went wrong" : "Building your GEO report"}
        </h1>
        <p className="text-[14px] text-slate-400 text-center mb-8">
          {isDone ? "All prompts ran through Claude. Redirecting to the dashboard..."
            : isError ? "The pipeline hit an error. Check the log below."
            : STAGE_LABELS[activeStage] || "Initialising..."}
        </p>

        {/* Stage progress */}
        {!isError && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <div className="space-y-2.5">
              {STAGE_ORDER.map((key, i) => {
                const done = isDone || i < activeIdx;
                const active = isRunning && i === activeIdx;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full shrink-0 grid place-items-center transition-all ${done ? "bg-emerald-500" : active ? "bg-blue-500" : "bg-slate-200"}`}>
                      {done
                        ? <svg viewBox="0 0 10 8" className="w-3 h-3" stroke="white" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l3 3 5-6"/></svg>
                        : active ? <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        : null}
                    </div>
                    <span className={`text-[13px] ${done ? "text-slate-600 font-medium" : active ? "text-blue-600 font-semibold" : "text-slate-300"}`}>
                      {STAGE_LABELS[key]}
                    </span>
                    {active && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin ml-auto shrink-0" />}
                  </div>
                );
              })}
            </div>
            {job && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-400">
                <span className="font-mono">{elapsed(runMs)} elapsed</span>
                {isDone && <span className="text-emerald-600 font-semibold">Complete</span>}
              </div>
            )}
          </div>
        )}

        {/* Log toggle */}
        {job?.tail && (
          <div className="mb-4">
            <button onClick={() => setShowLog((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-600 transition-colors w-full justify-center">
              <ChevronDown className={`w-4 h-4 transition-transform ${showLog ? "rotate-180" : ""}`} />
              {showLog ? "Hide" : "Show"} pipeline log
            </button>
            {showLog && (
              <pre className="mt-2 text-[11px] leading-relaxed font-mono bg-slate-900 text-slate-300 rounded-xl p-4 overflow-auto max-h-48 whitespace-pre-wrap">
                {job.tail}
              </pre>
            )}
          </div>
        )}

        {/* CTAs */}
        {isDone && (
          <div className="text-center">
            <button onClick={() => router.push("/report")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white"
              style={{ background: "#0056D6" }}>
              {redirecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              View dashboard
            </button>
          </div>
        )}
        {isError && (
          <div className="text-center space-y-3">
            {job?.tail && (
              <pre className="text-[11px] font-mono bg-slate-900 text-red-300 rounded-xl p-4 overflow-auto max-h-32 text-left whitespace-pre-wrap">{job.tail}</pre>
            )}
            <button onClick={() => router.push("/settings/runs")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Go to Runs →
            </button>
          </div>
        )}
        {!job && (
          <div className="text-center text-[13px] text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
            Starting pipeline...
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupLoadingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
      </div>
    }>
      <LoadingContent />
    </Suspense>
  );
}
