"use client";
import { Search } from "lucide-react";
import DataTable, { type Column } from "./DataTable";
import { ClassTag } from "./ui";
import { useSegmentDrawer } from "./BrandDrawerProvider";

export type CitationVM = { domain: string; klass: string; citations: number };

const columns: Column<CitationVM>[] = [
  {
    key: "domain", label: "Source", sortable: true,
    render: (r) => (
      <span className="group inline-flex items-center gap-1.5 text-slate-700 transition-colors" title={`See where ${r.domain} is cited`}>
        <span className="truncate">{r.domain}</span>
        <Search className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      </span>
    ),
  },
  { key: "klass", label: "Class", sortable: true, render: (r) => <ClassTag k={r.klass} /> },
  { key: "citations", label: "Citations", align: "right", mono: true, sortable: true },
];

export default function CitationsTable({ rows }: { rows: CitationVM[] }) {
  const { open } = useSegmentDrawer();
  // click a source → drawer with the exact link + the answers that cited it (and where RISA appears)
  return <DataTable columns={columns} rows={rows} onRowClick={(r) => open("cited", r.domain, r.domain)} initialSort={{ key: "citations", dir: "desc" }} maxHeight="60vh" />;
}
