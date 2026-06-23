import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalControls from "@/components/GlobalControls";
import PageTransition from "@/components/PageTransition";
import SectionTabs from "@/components/SectionTabs";
import { TooltipProvider } from "@/components/Tooltip";
import { RouteProgress } from "@/components/RouteProgress";
import { getSummary, getPrompts, getRunId } from "@/lib/data";

export const dynamic = "force-dynamic"; // data is read from the filesystem per request

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const summary = getSummary();
  const prompts = getPrompts();
  const runId = getRunId();
  const lastRun = runId && runId !== "none"
    ? new Date(runId).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : undefined;
  const personas = [...new Set(prompts.map((p) => p.persona).filter(Boolean))];
  const intents = [...new Set(prompts.map((p) => p.intent).filter(Boolean))];
  const engines = summary?.generated_engines?.length
    ? summary.generated_engines
    : [...new Set(prompts.map((p) => p.engine).filter(Boolean))];

  return (
    <TooltipProvider>
      <Suspense fallback={null}><RouteProgress /></Suspense>
      <div className="flex min-h-screen">
        <Suspense>
          <Sidebar brand={summary?.brand || "RISA Labs"} engines={engines} prompts={summary?.prompts_count || prompts.length} />
        </Suspense>
        <div className="flex-1 flex flex-col min-w-0">
          <Suspense>
            <GlobalControls personas={personas} intents={intents} lastRun={lastRun} />
          </Suspense>
          <Suspense>
            <SectionTabs />
          </Suspense>
          <main className="flex-1 p-6 overflow-auto scroll">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
