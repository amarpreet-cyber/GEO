"use client";
import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()}
      className="press ring-brand no-print inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand hover:bg-brand-dark px-3 py-1.5 rounded-lg transition">
      <Printer className="w-3.5 h-3.5" />{label}
    </button>
  );
}
