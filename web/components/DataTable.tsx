"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;     // custom cell
  value?: (row: T) => number | string; // sort key (defaults to row[key])
};

export default function DataTable<T extends Record<string, unknown>>({
  columns, rows, initialSort, rowHref, onRowClick, maxHeight = "70vh",
}: {
  columns: Column<T>[]; rows: T[]; initialSort?: { key: string; dir: "asc" | "desc" };
  rowHref?: (row: T) => string; onRowClick?: (row: T) => void; maxHeight?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort || null);

  const sorted = (() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const val = (r: T) => (col.value ? col.value(r) : (r[sort.key] as number | string));
    return [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      const n = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? n : -n;
    });
  })();

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const alignCls = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

  return (
    <div className="overflow-auto scroll rounded-lg border border-slate-200" style={{ maxHeight }}>
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr className="border-b border-slate-200">
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }}
                className={`py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${alignCls(c.align)} ${c.sortable ? "cursor-pointer select-none hover:text-slate-600" : ""}`}
                onClick={c.sortable ? () => toggle(c.key) : undefined}>
                <span className={`inline-flex items-center gap-1 ${c.align === "right" ? "flex-row-reverse" : ""}`}>
                  {c.label}
                  {c.sortable && (sort?.key === c.key
                    ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                    : <ChevronsUpDown className="w-3 h-3 text-slate-300" />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i}
              className={`border-b border-slate-100 last:border-0 ${rowHref || onRowClick ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50/60"}`}
              onClick={onRowClick ? () => onRowClick(row) : rowHref ? () => router.push(rowHref(row)) : undefined}>
              {columns.map((c) => (
                <td key={c.key} className={`py-2.5 px-3 ${alignCls(c.align)} ${c.mono ? "tnum text-slate-700" : "text-slate-600"}`}>
                  {c.render ? c.render(row) : (row[c.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && <tr><td colSpan={columns.length} className="py-8 text-center text-sm text-slate-400">Nothing in view.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
