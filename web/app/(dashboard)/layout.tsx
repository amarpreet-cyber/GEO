import { Suspense } from "react";
import TopNav from "@/components/TopNav";
import GlobalControls from "@/components/GlobalControls";
import PageTransition from "@/components/PageTransition";
import SectionTabs from "@/components/SectionTabs";
import { TooltipProvider } from "@/components/Tooltip";
import { PromptDrawerProvider } from "@/components/PromptDrawerProvider";
import { BrandDrawerProvider } from "@/components/BrandDrawerProvider";
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
     <PromptDrawerProvider>
     <BrandDrawerProvider>
      <Suspense fallback={null}><RouteProgress /></Suspense>
      <div className="flex h-screen flex-col bg-surface">
        <Suspense>
          <TopNav brand={summary?.brand || "RISA Labs"} engines={engines} />
        </Suspense>
        <Suspense>
          <SectionTabs />
        </Suspense>
        <Suspense>
          <GlobalControls personas={personas} intents={intents} lastRun={lastRun} />
        </Suspense>
        <main className="flex-1 min-h-0 overflow-auto scroll">
          <div className="mx-auto max-w-[1400px] px-6 py-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
     </BrandDrawerProvider>
     </PromptDrawerProvider>
    </TooltipProvider>
  );
}
