"use client";
import DataTable, { type Column } from "./DataTable";
import { Badge, SentPill } from "./ui";
import { usePromptDrawer } from "./PromptDrawerProvider";

export type PromptRowVM = {
  id: number; prompt: string; persona: string; intent: string;
  mentioned: boolean; position: number; sentiment: string; cites: number;
};

const columns: Column<PromptRowVM>[] = [
  { key: "prompt", label: "Prompt", sortable: true, render: (r) => <span className="text-slate-700 line-clamp-2 max-w-md block">{r.prompt}</span> },
  { key: "persona", label: "Persona", sortable: true, render: (r) => <Badge>{r.persona.toUpperCase()}</Badge> },
  { key: "intent", label: "Intent", sortable: true, render: (r) => <Badge variant="brand">{r.intent}</Badge> },
  { key: "mentioned", label: "Seen", align: "center", sortable: true, value: (r) => (r.mentioned ? 1 : 0),
    render: (r) => (r.mentioned ? <span className="text-pos font-medium">Yes</span> : <span className="text-slate-300">No</span>) },
  { key: "position", label: "Pos", align: "right", mono: true, sortable: true, value: (r) => (r.position > 0 ? r.position : 99),
    render: (r) => (r.position > 0 ? `#${r.position}` : "—") },
  { key: "sentiment", label: "Sentiment", sortable: true, render: (r) => <SentPill label={r.sentiment} /> },
  { key: "cites", label: "Cites", align: "right", mono: true, sortable: true },
];

export default function PromptsTable({ rows }: { rows: PromptRowVM[] }) {
  const { open } = usePromptDrawer();
  return <DataTable columns={columns} rows={rows} onRowClick={(r) => open(r.id)} initialSort={{ key: "position", dir: "asc" }} />;
}
