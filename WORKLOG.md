# Work log

Newest entries at the bottom. Each entry records what actually changed, what was learned, and what comes next.

## 2026-11-23 (Day 1)
- Chose **forkfit**, a meal planner using an LP (diet problem) solver. It is a consumer app in TypeScript, so it ships as a static site on GitHub Pages.
- Scaffolded Vite + TypeScript + Vitest + ESLint + Prettier. `check.sh` runs format check, tsc, lint, tests and a production build; CI runs it.
- Wrote the two-phase tableau simplex from scratch (`src/solver/simplex.ts`): handles `<=`, `>=`, `=`, negative RHS, redundant equalities, upper bounds. Dantzig pricing with a Bland's-rule fallback after 30 stalled pivots.
- 11 tests, including Beale's cycling example and a randomized comparison against brute-force vertex enumeration.
- Learned: `defineConfig` must be imported from `vitest/config` for the `test` key to type-check.
- Next: food database and model builder (Day 2). Pages deploy is wired but only a placeholder page exists, so the README link is marked planned.
