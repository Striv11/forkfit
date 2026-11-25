# forkfit

**Live demo: https://striv11.github.io/forkfit/** _(planned; deployed by `pages.yml` once the UI lands on Day 4)_

> Tell it your calorie, protein and budget targets; a from-scratch simplex solver finds the cheapest meal plan that hits them, entirely in your browser.

![CI](https://github.com/Striv11/forkfit/actions/workflows/ci.yml/badge.svg)

## Problem
Hitting nutrition targets (calories, protein, fibre, a sodium ceiling...) while staying on a grocery budget is a constrained optimisation problem. People solve it by guesswork, spreadsheets, or apps that only count calories and never *plan*. This is the classic "diet problem" (Stigler, 1945), the origin story of linear programming, wrapped in a UI a non-developer can use.

## Motivation
- Implement a real LP solver rather than calling a library: two-phase simplex, degeneracy handling (Bland fallback), infeasibility and unboundedness detection.
- Turn solver output into something humans trust: "why this plan?" explanations from shadow prices (which target is costing you money?), and a clear message when targets are impossible.
- Zero backend, zero accounts, no data leaves the device.

## Architecture
```
 foods.json ─┐
 targets  ───┼─► model builder ─► simplex solver ─► plan + explanations ─► UI
 prefs    ───┘   (Day 2, done)     (Day 1, done)       (Day 3 done; UI Day 4 done)
```
- `src/solver/simplex.ts`: dense two-phase tableau simplex. Minimises `c·x` s.t. `Ax {<=,>=,=} b`, `x >= 0`; upper bounds via `withUpperBounds`. Returns `optimal | infeasible | unbounded`, plus shadow prices (`duals`) read from the final tableau.
- `src/model/`: `foods.ts` (59 foods, 9 nutrients, diet tag) and `model.ts` (`buildProblem` maps foods + min/max nutrient targets + per-food serving caps to an LP; `planMeal` returns `{ok, plan}` or a typed error: `infeasible | unbounded | no-foods | invalid-input`).
- `src/model/explain.ts`: `explain(plan)` turns shadow prices into sentences ("each extra g of protein costs ~$0.04/day", "X is at its cap"); `filterByDiet` implements vegan/vegetarian presets.
- `src/ui/`: vanilla TypeScript + Vite, static build. `form.ts` validates form text into model inputs (plus presets), `view.ts` renders results as escaped HTML strings (pure, unit-tested without a DOM), `main.ts` wires the DOM.

Invariants: solver never returns a point violating a constraint beyond 1e-7; `x >= 0` always; malformed input throws.

## Setup
Requires Node 22+.
```
npm ci
npm test          # unit tests
npm run dev       # dev server
bash check.sh     # format, types, lint, tests, build (same as CI)
```

## Demo
**UI v1 is in.** Try: open the page, pick a preset ("2000 kcal, 100 g protein, $8/day"), press `Enter`, and see a plan with per-food servings, cost and a target-by-target breakdown in under a second.

## Design decisions & trade-offs
- Dense tableau over revised simplex: a meal plan has dozens of variables, not millions; clarity wins.
- Dantzig pricing with automatic switch to Bland's rule after a stall, so degenerate problems cannot cycle.
- Continuous servings first; whole-serving rounding (a small branch-and-bound) is a stretch goal.

## Roadmap
- [x] Day 1: scaffold, CI, simplex solver with tests
- [x] Day 2: food database and nutrition model builder
- [x] Day 3: shadow prices and plan explanations
- [x] Day 4: UI (Pages deploy runs on push; link unverified)
- [ ] Day 5: design system, light/dark, mobile
- [ ] Day 6: Playwright e2e and performance benchmark
- [ ] Day 7: polish, screenshots, docs
See [PLAN.md](PLAN.md).

## License
MIT. See [LICENSE](LICENSE).
