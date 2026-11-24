import { NUTRIENT_UNITS } from "./foods";
import type { Diet, Food } from "./foods";
import type { Plan } from "./model";

const RANK: Record<Diet, number> = { vegan: 0, vegetarian: 1, omnivore: 2 };

/** Foods allowed by a diet preset (vegetarian includes vegan foods). */
export function filterByDiet(foods: Food[], diet: Diet): Food[] {
  return foods.filter((f) => RANK[f.diet] <= RANK[diet]);
}

export interface BindingTarget {
  nutrient: string;
  kind: "min" | "max";
  bound: number;
  unit: string;
  /** USD per day per extra unit of the bound (absolute value). */
  costPerUnit: number;
  /** One-sentence human reading. */
  text: string;
}

export interface Explanation {
  /** Targets that cost money, most expensive first. */
  binding: BindingTarget[];
  /** Display-ready sentences: binding targets, then capped foods. */
  summary: string[];
}

const MIN_COST = 1e-6;

function dollars(v: number): string {
  return v >= 0.01 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`;
}

/** Names the binding targets and what each one costs at the margin. */
export function explain(plan: Plan): Explanation {
  const binding: BindingTarget[] = [];
  for (const sp of plan.shadowPrices) {
    const cost = Math.abs(sp.marginalCost);
    if (cost < MIN_COST) continue;
    const unit = NUTRIENT_UNITS[sp.nutrient];
    const text =
      sp.kind === "min"
        ? `Your ${sp.nutrient} minimum (${sp.bound} ${unit}) is binding: each extra ${unit} costs about ${dollars(cost)}/day.`
        : `Your ${sp.nutrient} maximum (${sp.bound} ${unit}) is binding: each ${unit} you allowed would save about ${dollars(cost)}/day.`;
    binding.push({
      nutrient: sp.nutrient,
      kind: sp.kind,
      bound: sp.bound,
      unit,
      costPerUnit: cost,
      text,
    });
  }
  binding.sort((a, b) => b.costPerUnit - a.costPerUnit);
  const summary = binding.map((b) => b.text);
  for (const c of plan.capped)
    summary.push(
      `${c.food.name} is at your ${c.cap}-serving cap; one more serving would save about ${dollars(c.savingPerServing)}/day.`,
    );
  if (summary.length === 0)
    summary.push(
      "No target is costing you extra: the cheapest foods already satisfy them.",
    );
  return { binding, summary };
}
