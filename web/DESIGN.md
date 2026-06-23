# RISA GEO — DESIGN.md

The design system for this app. Any agent or contributor: read this before touching UI.
Distilled from impeccable (anti-patterns), awesome-design-md (system structure), and
Grafana dashboard conventions (at-a-glance data IA).

## Principles (non-negotiable)

1. **Typeset, don't default.** UI type is **Geist**; all data/numbers/codes are **Geist Mono**.
   Never Inter, Arial, or `system-ui`. Numbers in tables, KPIs, percentages, positions, counts,
   and domains use the mono face — it reads as data.
2. **Tint every neutral.** No pure black or pure gray. The neutral ramp (`slate` here) is cool and
   faintly brand-tinted. Text is `slate-700/600/500/400`, never `#000`/`#888`.
3. **No gray text on color.** On a brand/colored fill use white or a same-hue dark tone. Never gray.
4. **Don't card everything; never nest cards.** One elevation level. KPIs are borderless **stat
   blocks** separated by hairlines, not boxes-in-boxes. Use whitespace + section headers to group.
5. **Restrained elevation.** Hairline tinted borders + one soft shadow token. No heavy drop shadows.
6. **Motion is purposeful and quick.** Ease-out, 80–160ms. Never bounce/elastic.
7. **At-a-glance (Grafana).** Most important number top-left. Stat row first, then charts, then tables.
   Consistent units (% always shown). Threshold colors: green ≥ good, amber mid, red low.
   Don't overload a view with panels — distill to what changes a decision.

## Tokens

- **Brand** `--brand #4f46e5` (placeholder indigo; set from the RISA logo when available),
  `--brand-dark`, `--brand-light`. Use the accent *strategically* (primary actions, the active nav,
  the brand bar, the RISA bar in charts) — not as a fill everywhere.
- **Neutrals** tinted `slate` ramp (50→900), cool with a hint of indigo.
- **Semantic** citation classes: owned `#10b981`, earned `#3b82f6`, competitor `#f43f5e`, social `#8b5cf6`.
  Sentiment/threshold: pos `#22c55e`, neu `#f59e0b`, neg `#ef4444`, absent `slate-400`.
- **Surface** white on `slate-100` app background. **Border** `slate-200`. **Radius** `lg/xl`.
- **Shadow** `--shadow` single soft token; default to border-only, add shadow only for raised menus/modals.

## Type scale

| Role | Size / weight | Face |
|---|---|---|
| Page title | 20px / 600 | sans, tracking-tight |
| Section title | 13px / 600 | sans |
| Body | 14px / 400 | sans |
| Caption / meta | 11–12px / 400 | sans, slate-400 |
| **Data / KPI value** | 24–32px / 600 | **mono** |
| Table numerics | 13px | **mono** |

## Layout

- App shell: 240px left nav (sticky) + sticky GlobalControls bar + scrolling main on `slate-100`.
- Content max rhythm: 20px gaps, 12-col grid. Group with section headers + hairlines over nested cards.
- KPI row = borderless stat blocks divided by hairlines (Grafana stat panel).
- Empty states are designed (icon-light, one line of guidance + the exact command to run).

## Components

- `Card` = flat surface (hairline border, no/!soft shadow, generous padding). Do not nest.
- `Stat` = borderless KPI block: caption label, big mono value, optional delta + sparkline.
- `Section` = label + hairline, used to group within a page instead of more cards.
- Pills/tags: tone-on-tone (e.g., emerald-700 on emerald-50), never gray-on-color.
