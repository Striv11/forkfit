import { describe, expect, it } from "vitest";
import { FOODS } from "../src/model/foods";
import { filterByDiet } from "../src/model/explain";
import { planMeal } from "../src/model/model";
import { PRESETS, parseForm, type FormValues } from "../src/ui/form";
import { esc, renderEmpty, renderResult } from "../src/ui/view";

const base = PRESETS[0]!.values;
const run = (v: FormValues, budgetOnly = false) => {
  const p = parseForm(v);
  if (!p.ok) throw new Error("parse failed");
  const r = planMeal(
    filterByDiet(FOODS, p.value.diet),
    p.value.targets,
    p.value.limits,
  );
  return renderResult(r, budgetOnly ? p.value.budget : undefined);
};

describe("parseForm", () => {
  it("maps fields to targets", () => {
    const p = parseForm(base);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.value.targets.protein).toEqual({ min: 100 });
    expect(p.value.targets.sodium).toEqual({ max: 2300 });
    expect(p.value.targets.calories?.min).toBeCloseTo(1900);
    expect(p.value.targets.calories?.max).toBeCloseTo(2100);
    expect(p.value.budget).toBe(8);
  });
  it("reports per-field errors", () => {
    const p = parseForm({ ...base, protein: "abc", fibre: "-3" });
    expect(p.ok).toBe(false);
    if (p.ok) return;
    expect(Object.keys(p.errors).sort()).toEqual(["fibre", "protein"]);
  });
  it("requires at least one target", () => {
    const p = parseForm({
      ...base,
      calories: "",
      protein: "",
      fibre: "",
      sodiumMax: "",
    });
    expect(p.ok).toBe(false);
  });
});

describe("views", () => {
  it("empty state invites the user to solve", () => {
    expect(renderEmpty()).toContain("Enter");
  });
  it("every preset except the impossible one yields a plan", () => {
    for (const p of PRESETS) {
      const html = run(p.values);
      expect(html).toContain(
        p.id === "impossible" ? 'data-state="error"' : 'data-state="plan"',
      );
    }
  });
  it("infeasible targets show an alert with a hint", () => {
    const html = run(PRESETS.find((p) => p.id === "impossible")!.values);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Try lowering");
  });
  it("warns when the cheapest plan exceeds the budget", () => {
    expect(run({ ...base, budget: "0.5" }, true)).toContain(
      "over your $0.50 budget",
    );
    expect(run({ ...base, budget: "100" }, true)).toContain(
      "Within your $100.00",
    );
  });
  it("escapes HTML", () => {
    expect(esc(`<img onerror="x">&'`)).toBe(
      "&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;",
    );
  });
});
