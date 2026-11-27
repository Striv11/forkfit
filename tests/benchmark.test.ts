import { describe, expect, it } from "vitest";
import { FOODS, NUTRIENTS, type Food } from "../src/model/foods";
import { planMeal } from "../src/model/model";

/** Deterministic pseudo-random variations of the real foods, up to n foods. */
function syntheticFoods(n: number): Food[] {
  let s = 12345;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  return Array.from({ length: n }, (_, i) => {
    const base = FOODS[i % FOODS.length] as Food;
    const nutrients = { ...base.nutrients };
    for (const k of NUTRIENTS)
      nutrients[k] = base.nutrients[k] * (0.7 + 0.6 * rnd());
    return {
      ...base,
      id: `${base.id}-${i}`,
      price: Math.round(base.price * (0.7 + 0.6 * rnd()) * 100) / 100,
      nutrients,
    };
  });
}

describe("performance", () => {
  it("solves a 200-food plan in under 50 ms", () => {
    const foods = syntheticFoods(200);
    const targets = {
      calories: { min: 1900, max: 2100 },
      protein: { min: 100 },
      fibre: { min: 30 },
      sodium: { max: 2300 },
    };
    planMeal(foods, targets); // warm-up (JIT)
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const r = planMeal(foods, targets);
      times.push(performance.now() - t0);
      expect(r.ok).toBe(true);
    }
    times.sort((a, b) => a - b);
    const median = times[2] as number;
    console.log(`200-food solve median ${median.toFixed(1)} ms`);
    expect(median).toBeLessThan(50);
  });
});
