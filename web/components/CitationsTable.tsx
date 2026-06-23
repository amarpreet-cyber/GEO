"use client";
import { ExternalLink } from "lucide-react";
import DataTable, { type Column } from "./DataTable";
import { ClassTag } from "./ui";

export type CitationVM = { domain: string; klass: string; citations: number };

const columns: Column<CitationVM>[] = [
  {
    key: "domain", label: "Source", sortable: true,
    render: (r) => (
      <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 text-slate-700 hover:text-brand transition-colors"
        title={`Open ${r.domain}`}>
        <span className="truncate">{r.domain}</span>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      </a>
    ),
  },
  { key: "klass", label: "Class", sortable: true, render: (r) => <ClassTag k={r.klass} /> },
  { key: "citations", label: "Citations", align: "right", mono: true, sortable: true },
];

export default function CitationsTable({ rows }: { rows: CitationVM[] }) {
  return <DataTable columns={columns} rows={rows} initialSort={{ key: "citations", dir: "desc" }} maxHeight="60vh" />;
}
