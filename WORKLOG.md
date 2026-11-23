# Work log

Newest entries at the bottom. Each entry records what actually changed, what was learned, and what comes next.

## 2026-11-23 (Day 1)
- Chose **forkfit**, a meal planner using an LP (diet problem) solver. It is a consumer app in TypeScript, so it ships as a static site on GitHub Pages.
- Scaffolded Vite + TypeScript + Vitest + ESLint + Prettier. `check.sh` runs format check, tsc, lint, tests and a production build; CI runs it.
- Wrote the two-phase tableau simplex from scratch (`src/solver/simplex.ts`): handles `<=`, `>=`, `=`, negative RHS, redundant equalities, upper bounds. Dantzig pricing with a Bland's-rule fallback after 30 stalled pivots.
- 11 tests, including Beale's cycling example and a randomized comparison against brute-force vertex enumeration.
- Learned: `defineConfig` must be imported from `vitest/config` for the `test` key to type-check.
- Next: food database and model builder (Day 2). Pages deploy is wired but only a placeholder page exists, so the README link is marked planned.

## 2026-11-24 (Day 2)
- Added `src/model/foods.ts`: 59 foods, 9 nutrients (kcal, protein, fat, carbs, fibre, sodium, calcium, iron, vitamin C), rough prices, and a `diet` tag (vegan/vegetarian/omnivore) ready for Day 3 presets.
- Added `src/model/model.ts`: `buildProblem` (min/max targets → `>=`/`<=` rows, per-food caps via `withUpperBounds`, default 4 servings) and `planMeal`, which returns a result union with typed errors instead of throwing on impossible targets.
- Tests (`tests/model.test.ts`): DB sanity (unique ids, macros vs calories), a Stigler-style 9-nutrient problem with a hand-derived optimum (40/3) and dual certificate, per-food caps, infeasible/invalid/no-foods errors, and a realistic day on the real DB.
- Learned: vitest only picks up `tests/**`; a test placed in `src/` silently doesn't run. `noUncheckedIndexedAccess` is on, so indexed reads need `?? 0`.
- Next: Day 3, duals/shadow prices from the final tableau and `explain(plan)`, diet presets.
