"use client";
// Charts whose segments are clickable: clicking a bar/slice opens the prompts behind
// that segment (persona, intent, sentiment...). Server pages render these instead of the
// raw VBar/Donut when the segment should drill to its prompts.
import { VBar, Donut } from "@/components/charts";
import { useSegmentDrawer } from "@/components/BrandDrawerProvider";

export function DrillVBar({
  data, field, height = 210, unit = "",
}: { data: Record<string, unknown>[]; field: string; height?: number; unit?: string }) {
  const { open } = useSegmentDrawer();
  return <VBar data={data} height={height} unit={unit} onSelect={(name) => name && open(field, name, name)} />;
}

export function DrillDonut({
  data, field, height = 200, total, totalLabel, unit = "",
}: { data: { name: string; value: number; color: string }[]; field: string; height?: number; total?: number; totalLabel?: string; unit?: string }) {
  const { open } = useSegmentDrawer();
  return <Donut data={data} height={height} total={total} totalLabel={totalLabel} unit={unit} onSelect={(name) => name && open(field, name, name)} />;
}
