"use client";
// Dark-bubble tooltip + the small "i" info button used to attach a one-line brief
// to every metric. Adopted from the RISA Outreach design system (Radix + scale-in).
import * as RT from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <RT.Provider delayDuration={150} skipDelayDuration={300}>{children}</RT.Provider>;
}

export function Tooltip({
  label, side = "top", children,
}: { label?: string | null; side?: "top" | "right" | "bottom" | "left"; children: React.ReactNode }) {
  if (!label) return <>{children}</>;
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content side={side} sideOffset={6}
          className="z-[120] max-w-[260px] rounded-md bg-[#0F0F0F] px-2.5 py-1.5 text-[11px] leading-relaxed text-white shadow-md data-[state=delayed-open]:animate-scale-in">
          {label}
          <RT.Arrow className="fill-[#0F0F0F]" />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}

// The "i" affordance. Hover/focus reveals the brief. Keep briefs to one sentence.
export function InfoDot({ brief, side = "top", className }: { brief: string; side?: "top" | "right" | "bottom" | "left"; className?: string }) {
  return (
    <Tooltip label={brief} side={side}>
      <button type="button" aria-label="What is this?"
        className={cn("ring-brand inline-grid place-items-center w-4 h-4 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors align-middle", className)}>
        <Info className="w-3 h-3" />
      </button>
    </Tooltip>
  );
}
