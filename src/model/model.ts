import { solve, withUpperBounds, type Problem } from "../solver/simplex";
import type { Food, NutrientId } from "./foods";

/** Inclusive daily bounds for one nutrient. At least one side should be set. */
export interface Target {
  min?: number;
  max?: number;
}

export type Targets = Partial<Record<NutrientId, Target>>;

export interface Limits {
  /** Default cap on servings per food per day. Default 4. */
  maxServings?: number;
  /** Per-food overrides keyed by food id. */
  perFood?: Record<string, number>;
}

export const DEFAULT_MAX_SERVINGS = 4;

/** An LP together with the bookkeeping needed to read its solution. */
export interface Model {
  problem: Problem;
  foods: Food[];
  /** One entry per nutrient constraint row (before the bound rows). */
  rows: { nutrient: NutrientId; kind: "min" | "max" }[];
}

export type PlanError =
  | { kind: "no-foods" }
  | { kind: "invalid-input"; message: string }
  | { kind: "infeasible"; message: string }
  | { kind: "unbounded"; message: string };

export interface PlanLine {
  food: Food;
  servings: number;
  cost: number;
}

/** Sensitivity of the optimal cost to one nutrient bound. */
export interface ShadowPrice {
  nutrient: NutrientId;
  kind: "min" | "max";
  /** The bound the user asked for. */
  bound: number;
  /** Extra daily cost (USD) per +1 unit of the bound; <= 0 for a max. */
  marginalCost: number;
}

export interface Plan {
  lines: PlanLine[];
  cost: number;
  totals: Record<NutrientId, number>;
  /** One entry per nutrient bound, in constraint order. */
  shadowPrices: ShadowPrice[];
  /** Foods held at their serving cap that would otherwise be used more. */
  capped: { food: Food; cap: number; savingPerServing: number }[];
}

export type PlanResult =
  { ok: true; plan: Plan } | { ok: false; error: PlanError };

/** Maps foods + nutrient targets + serving limits to a minimum-cost LP. */
export function buildProblem(
  foods: Food[],
  targets: Targets,
  limits: Limits = {},
): Model {
  if (foods.length === 0) throw new RangeError("no foods");
  const rows: Model["rows"] = [];
  const constraints: Problem["constraints"] = [];
  for (const [nutrient, t] of Object.entries(targets) as [
    NutrientId,
    Target | undefined,
  ][]) {
    if (!t) continue;
    const a = foods.map((f) => f.nutrients[nutrient]);
    if (a.some((v) => v === undefined))
      throw new RangeError(`unknown nutrient "${nutrient}"`);
    for (const [kind, v] of [
      ["min", t.min],
      ["max", t.max],
    ] as const) {
      if (v === undefined) continue;
      if (!Number.isFinite(v) || v < 0)
        throw new RangeError(
          `${nutrient}.${kind} must be a finite number >= 0`,
        );
      rows.push({ nutrient, kind });
      constraints.push({ a, op: kind === "min" ? ">=" : "<=", b: v });
    }
  }
  const cap = limits.maxServings ?? DEFAULT_MAX_SERVINGS;
  const upper = foods.map((f) => limits.perFood?.[f.id] ?? cap);
  if (upper.some((u) => !(u >= 0)))
    throw new RangeError("serving limits must be >= 0");
  const problem = withUpperBounds(
    { c: foods.map((f) => f.price), constraints },
    upper,
  );
  return { problem, foods, rows };
}

const EPS = 1e-7;

/** Builds, solves and interprets the plan. Never throws on bad targets. */
export function planMeal(
  foods: Food[],
  targets: Targets,
  limits: Limits = {},
): PlanResult {
  if (foods.length === 0) return { ok: false, error: { kind: "no-foods" } };
  let model: Model;
  try {
    model = buildProblem(foods, targets, limits);
  } catch (e) {
    return {
      ok: false,
      error: { kind: "invalid-input", message: (e as Error).message },
    };
  }
  const sol = solve(model.problem);
  if (sol.status === "infeasible")
    return {
      ok: false,
      error: {
        kind: "infeasible",
        message:
          "No combination of the available foods meets every target within the serving limits.",
      },
    };
  if (sol.status === "unbounded")
    return {
      ok: false,
      error: { kind: "unbounded", message: "The problem is unbounded." },
    };
  const totals = {} as Record<NutrientId, number>;
  const lines: PlanLine[] = [];
  foods.forEach((f, j) => {
    const xj = sol.x[j] ?? 0;
    const servings = xj < EPS ? 0 : xj;
    for (const n of Object.keys(f.nutrients) as NutrientId[])
      totals[n] = (totals[n] ?? 0) + servings * f.nutrients[n];
    if (servings > 0)
      lines.push({ food: f, servings, cost: servings * f.price });
  });
  const shadowPrices = model.rows.map((row, i) => ({
    nutrient: row.nutrient,
    kind: row.kind,
    bound: model.problem.constraints[i]!.b,
    marginalCost: sol.duals[i] ?? 0,
  }));
  // Bound rows follow the nutrient rows, one per food (all caps are finite).
  const capped: Plan["capped"] = [];
  const base = model.rows.length;
  foods.forEach((f, j) => {
    const dual = sol.duals[base + j] ?? 0;
    if (dual < -EPS)
      capped.push({
        food: f,
        cap: model.problem.constraints[base + j]!.b,
        savingPerServing: -dual,
      });
  });
  return {
    ok: true,
    plan: { lines, cost: sol.objective, totals, shadowPrices, capped },
  };
}
