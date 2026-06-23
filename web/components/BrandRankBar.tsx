"use client";
// Clickable Share-of-Voice / brand leaderboard. Each row opens the prompts where that
// brand is mentioned (then drill into any prompt's analysis). Same look as RankBar.
import { rankRow } from "@/components/ui";
import { useSegmentDrawer } from "@/components/BrandDrawerProvider";

export type RankItem = { name: string; value: number; isBrand?: boolean; meta?: string };

export default function BrandRankBar({ items, unit = "%" }: { items: RankItem[]; unit?: string }) {
  const { open } = useSegmentDrawer();
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-1">
      {items.map((it, i) => (
        <button key={it.name} type="button" onClick={() => open("name", it.name, it.name)} className="block w-full ds-card-hover rounded-lg">
          {rankRow(it, i, max, unit)}
        </button>
      ))}
      {items.length === 0 && <p className="text-[13px] text-slate-400 py-2">Nothing in view.</p>}
    </div>
  );
}
