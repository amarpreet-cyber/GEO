"use client";
// Right-side slide-in panel (Radix Dialog). Holds the level-2/level-3 drill-down
// for a metric: breakdown chart + the raw underlying rows. Accessible (focus trap,
// ESC, scroll-lock) via Radix.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Drawer({
  open, onOpenChange, title, subtitle, children, footer, size = "md",
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; size?: "md" | "lg";
}) {
  const width = size === "lg" ? "max-w-[720px]" : "max-w-[460px]";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/30 animate-overlay-in" />
        <Dialog.Content
          className={`fixed right-0 top-0 z-[111] h-full w-full ${width} bg-white shadow-2xl flex flex-col animate-drawer-in outline-none`}
          aria-describedby={undefined}>
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
            <div className="min-w-0">
              <Dialog.Title className="text-[14px] font-bold text-ink tracking-tight truncate">{title}</Dialog.Title>
              {subtitle && <div className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{subtitle}</div>}
            </div>
            <Dialog.Close className="ring-brand shrink-0 w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-auto scroll px-5 py-4">{children}</div>
          {footer && <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
