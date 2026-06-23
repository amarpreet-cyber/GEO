// Server helper: load + filter + aggregate the common bundle every screen needs.
import "server-only";
import { getSummary, getPrompts, getActionsByPrompt, getCompetitorMeta, getDomainClass } from "./data";
import { parseFilters, applyFilters, type SP } from "./filters";
import { aggregate } from "./derive";

export function loadFiltered(sp: SP) {
  const summary = getSummary();
  const all = getPrompts();
  const f = parseFilters(sp);
  const filtered = applyFilters(all, f);
  const brand = summary?.brand || "RISA Labs";
  const agg = aggregate(filtered, brand, getCompetitorMeta(), getDomainClass());
  return { summary, all, filtered, f, brand, agg, actionsByPrompt: getActionsByPrompt() };
}
