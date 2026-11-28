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

## 2026-11-24 (Day 3)
- Solver now returns `duals` (shadow prices) from the final tableau: the reduced cost of each row's slack/surplus/artificial column, sign-corrected for rows negated during normalisation. Tests: strong duality `b·y = c·x` with mixed `<=`/`>=`/`=` and negated rows, and duals equal to finite-difference derivatives of the optimum.
- `planMeal` plans now carry `shadowPrices` (per nutrient bound) and `capped` (foods held at a serving cap). New `src/model/explain.ts`: `explain(plan)` names binding targets sorted by marginal cost, and `filterByDiet` provides vegan/vegetarian presets.
- Learned: a dual is only a local derivative; the finite-difference test uses a small step to stay within the same basis. Cap rows come after nutrient rows, so their duals give "one more serving saves $X" for free.
- Next: Day 4, UI v1: targets form, plan table, empty/error states, Pages deploy.

## 2026-11-25 (Day 4)
- UI v1: targets form with presets, diet select, budget, serving cap; empty state before the first solve; plan table (foods, servings, cost), nutrient totals, "Why this plan?" from `explain()`; an alert state for infeasible targets with a hint; per-field validation messages. Enter submits the form.
- Split for testability: `src/ui/form.ts` (parse/validate, presets), `src/ui/view.ts` (pure HTML-string renderers with escaping), `main.ts` (DOM wiring only). 8 new tests in `tests/ui.test.ts` cover parsing, every preset, the infeasible alert, budget over/under, and escaping.
- Budget is a check on the cheapest plan, not a constraint: if even the minimum cost exceeds it, the UI says by how much.
- Learned: my first "impossible" preset (4000 kcal, 300 g protein, cap 2) was actually feasible; the tests caught it. Needed a 1-serving cap and 400 g protein.
- Not verified: the live Pages URL (no network/credentials here), so the Day 4 PLAN row is marked partial.
- Next: Day 5, CSS tokens with light/dark, 360 px layout, `/` `Enter` `?` shortcuts, landing section, loading state; confirm the Pages deploy.

## 2026-11-26 (Day 5)
- Design system: CSS tokens (spacing, type scale, radius, colours) in `style.css`, light and dark palettes via `data-theme`; theme defaults to the system preference and the toggle is persisted in localStorage. Tables scroll horizontally in a wrapper, the form grid uses `min(14rem, 100%)` so a 360 px viewport doesn't overflow, inputs have 44 px touch targets and a visible focus ring.
- Shortcuts: `/` focuses the form, `?` opens a help dialog, `Esc` closes it, `Enter` still submits natively. Key mapping is a pure function (`shortcutAction`) so it is unit-tested, including "don't hijack typing" and modifier keys. Added landing section and a loading state (solve deferred with `setTimeout` so it paints).
- 8 new tests (`tests/shortcuts.test.ts`); check.sh green.
- Not verified: actual rendering at 360 px and contrast in a browser (none available here). Day 6 Playwright should cover it.
- Next: Day 6, Playwright e2e (empty state, preset solve, infeasible, dark toggle) and a 200-food benchmark asserted under 50 ms.

## 2026-11-27 (Day 6)
- Added Playwright (`e2e/app.spec.ts`, `playwright.config.ts`): empty state, preset solve, Enter solves, infeasible alert, dark toggle persists across reload, `?` `Esc` `/` shortcuts, and a no-horizontal-overflow check. Runs in two projects, desktop (1280 px) and mobile (360 px): 14 tests pass locally in real Chromium, which also covers the 360 px layout that was unverified on Day 5.
- e2e runs as its own CI job (`npx playwright test`, which builds and serves via `vite preview`); it is not part of `check.sh` because it needs a downloaded browser.
- Benchmark (`tests/benchmark.test.ts`): 200 synthetic foods (perturbed copies of the real DB) with 4 target rows, median of 5 solves asserted under 50 ms; passes in `check.sh`.
- Not done: the overflow check is only a scrollWidth test, not a visual review of contrast.
- Next: Day 7, custom foods in localStorage, shareable URL, screenshots, axe a11y pass.

## 2026-11-28 (Day 7, part 1)
- Shareable URL: `formToQuery`/`queryToForm` in `src/ui/form.ts`. A successful solve writes the targets to the query string (`history.replaceState`); loading a URL with known keys prefills the form and solves immediately. Unknown keys are ignored, values are length-capped and still go through `parseForm`, so a hand-edited link yields normal field errors. 3 new unit tests (round-trip over all presets, empty/unknown, bad values).
- Added an e2e test (solve, check URL, reload the URL, plan and fields restored). Not run here: no Chromium in this environment, so it is unverified until CI. `check.sh` passes (47 tests).
- Next: custom foods in localStorage, screenshots in README, axe a11y pass.
