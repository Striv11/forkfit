import { describe, expect, it } from "vitest";
import {
  FOODS,
  NUTRIENTS,
  type Food,
  type NutrientId,
} from "../src/model/foods";
import { buildProblem, planMeal, type Targets } from "../src/model/model";

function food(
  id: string,
  price: number,
  n: Partial<Record<NutrientId, number>>,
): Food {
  const nutrients = {} as Record<NutrientId, number>;
  for (const k of NUTRIENTS) nutrients[k] = n[k] ?? 0;
  return { id, name: id, serving: "1", price, diet: "vegan", nutrients };
}

describe("food database", () => {
  it("has ~60 foods with unique ids and sane values", () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(55);
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
    for (const f of FOODS) {
      expect(f.price).toBeGreaterThan(0);
      for (const k of NUTRIENTS)
        expect(f.nutrients[k]).toBeGreaterThanOrEqual(0);
      // Macro energy should roughly agree with the calories column.
      const kcal =
        4 * f.nutrients.protein + 4 * f.nutrients.carbs + 9 * f.nutrients.fat;
      expect(Math.abs(kcal - f.nutrients.calories)).toBeLessThan(
        0.25 * f.nutrients.calories + 20,
      );
    }
  });
});

describe("buildProblem", () => {
  it("emits one row per bound plus one bound row per food", () => {
    const foods = FOODS.slice(0, 5);
    const m = buildProblem(
      foods,
      { calories: { min: 2000, max: 2500 }, protein: { min: 50 } },
      { maxServings: 3 },
    );
    expect(m.rows).toHaveLength(3);
    expect(m.problem.constraints).toHaveLength(3 + 5);
    expect(m.problem.c).toEqual(foods.map((f) => f.price));
  });

  it("rejects negative or non-finite bounds", () => {
    expect(() => buildProblem(FOODS, { protein: { min: -1 } })).toThrow();
    expect(() => buildProblem(FOODS, { protein: { min: NaN } })).toThrow();
  });
});

describe("planMeal", () => {
  // Stigler-style: nine nutrients, only n1 and n2 are binding.
  // A=(2,1) @3, B=(1,2) @2, need n1>=8, n2>=8 -> x=(8/3,8/3), cost 40/3.
  // Dual certificate y=(4/3,1/3): 2y1+y2=3, y1+2y2=2, b·y = 8*5/3 = 40/3.
  it("solves a 9-nutrient Stigler-style problem to the known cost", () => {
    const rich = Object.fromEntries(NUTRIENTS.slice(2).map((k) => [k, 10]));
    const A = food("A", 3, { calories: 2, protein: 1, ...rich });
    const B = food("B", 2, { calories: 1, protein: 2, ...rich });
    const C = food("C", 9, { calories: 5, protein: 5, ...rich });
    const targets: Targets = { calories: { min: 8 }, protein: { min: 8 } };
    for (const k of NUTRIENTS.slice(2)) targets[k] = { min: 20 };
    const r = planMeal([A, B, C], targets, { maxServings: 10 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.cost).toBeCloseTo(40 / 3, 6);
    const byId = Object.fromEntries(r.plan.lines.map((l) => [l.food.id, l]));
    expect(byId.A?.servings).toBeCloseTo(8 / 3, 6);
    expect(byId.B?.servings).toBeCloseTo(8 / 3, 6);
    expect(byId.C).toBeUndefined();
  });

  it("respects per-food and default max servings", () => {
    const cheap = food("cheap", 1, { protein: 10 });
    const dear = food("dear", 5, { protein: 10 });
    const r = planMeal(
      [cheap, dear],
      { protein: { min: 50 } },
      {
        maxServings: 10,
        perFood: { cheap: 2 },
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = Object.fromEntries(
      r.plan.lines.map((l) => [l.food.id, l.servings]),
    );
    expect(s.cheap).toBeCloseTo(2, 6);
    expect(s.dear).toBeCloseTo(3, 6);
    expect(r.plan.cost).toBeCloseTo(17, 6);
  });

  it("returns a typed infeasible error for impossible targets", () => {
    const r = planMeal(FOODS, { calories: { min: 100000 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("infeasible");
    const conflict = planMeal(FOODS, { protein: { min: 100, max: 50 } });
    expect(conflict.ok === false && conflict.error.kind).toBe("infeasible");
  });

  it("returns typed errors for no foods and invalid input", () => {
    const none = planMeal([], {});
    expect(none.ok === false && none.error.kind).toBe("no-foods");
    const bad = planMeal(FOODS, { protein: { min: -5 } });
    expect(bad.ok === false && bad.error.kind).toBe("invalid-input");
  });

  it("plans a realistic day from the real database within all targets", () => {
    const targets: Targets = {
      calories: { min: 2000, max: 2200 },
      protein: { min: 100 },
      fibre: { min: 30 },
      sodium: { max: 2300 },
      calcium: { min: 1000 },
      iron: { min: 8 },
      vitaminC: { min: 90 },
    };
    const r = planMeal(FOODS, targets);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = r.plan.totals;
    expect(t.calories).toBeGreaterThanOrEqual(2000 - 1e-6);
    expect(t.calories).toBeLessThanOrEqual(2200 + 1e-6);
    expect(t.protein).toBeGreaterThanOrEqual(100 - 1e-6);
    expect(t.sodium).toBeLessThanOrEqual(2300 + 1e-6);
    expect(t.vitaminC).toBeGreaterThanOrEqual(90 - 1e-6);
    for (const l of r.plan.lines)
      expect(l.servings).toBeLessThanOrEqual(4 + 1e-9);
    expect(r.plan.cost).toBeGreaterThan(1);
    expect(r.plan.cost).toBeLessThan(15);
  });
});
