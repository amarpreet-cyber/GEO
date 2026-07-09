"use client";
import { Download } from "lucide-react";
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90"
      style={{ background: "#0056D6" }}>
      <Download className="w-4 h-4" />
      Download PDF
    </button>
  );
}
