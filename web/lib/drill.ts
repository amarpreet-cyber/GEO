// Shape of a metric drill-down. Server pages build this from REAL data and pass it
// to <DrillStat detail={...}>. Level 2 = blurb + chart; Level 3 = raw underlying rows
// (the "database" records behind the number), each optionally linking out.
import type { ReactNode } from "react";

export type DrillSlice = { name: string; value: number; color?: string };

export type DrillRow = {
  label: string;            // record label (a prompt, a domain, a page, a competitor)
  value?: ReactNode;        // its contribution (count, %, score)
  sub?: string;             // secondary line
  href?: string;            // make the row clickable
  external?: boolean;       // open href in a new tab (e.g. a cited source URL)
  tag?: string;             // small class/severity tag
  tagColor?: string;
};

export type DrillDetail = {
  blurb?: string;                                   // one-line "what this measures / how it's computed"
  chart?: { kind: "bar" | "donut"; unit?: string; data: DrillSlice[] };
  rowsTitle?: string;
  rows?: DrillRow[];                                // level 3 — the raw rows
  href?: string;                                    // "open full view" (section page)
  hrefLabel?: string;
};
