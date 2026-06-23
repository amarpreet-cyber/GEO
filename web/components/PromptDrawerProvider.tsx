"use client";
// One shared in-context prompt-analysis drawer for the whole app. Mounted once in the
// dashboard layout so ANY prompt click — table row, list item, drill row — opens the
// same layered analysis instead of navigating to a separate page.
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { PromptDrawer } from "@/components/PromptDrawer";

const Ctx = createContext<{ open: (id: number) => void }>({ open: () => {} });
export function usePromptDrawer() { return useContext(Ctx); }

export function PromptDrawerProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<number | null>(null);
  const open = useCallback((n: number) => setId(n), []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <PromptDrawer id={id} open={id != null} onOpenChange={(v) => { if (!v) setId(null); }} />
    </Ctx.Provider>
  );
}

// Drop-in clickable wrapper for a prompt reference (used in server-rendered lists).
export function PromptTrigger({
  id, className, children, title,
}: { id: number; className?: string; children: ReactNode; title?: string }) {
  const { open } = usePromptDrawer();
  return (
    <button type="button" title={title} onClick={(e) => { e.stopPropagation(); open(id); }} className={className}>
      {children}
    </button>
  );
}
