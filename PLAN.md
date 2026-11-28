# Plan

Seven-day arc. Every milestone has acceptance criteria that can be checked by a test or a command.

| Day | Milestone | Acceptance criteria | Status |
|-----|-----------|---------------------|--------|
| 1 | Scaffold + simplex solver | `bash check.sh` passes; solver returns correct optimum for textbook LPs, detects infeasible/unbounded, survives Beale's cycling example, matches brute-force vertex enumeration on 60 random 2D LPs; CI and Pages workflows exist | [x] |
| 2 | Food database + model builder | ~60 foods with per-serving nutrients and price; `buildProblem(foods, targets, limits)` maps to an LP; test: Stigler-style 9-nutrient problem solves to a known cost; per-food max servings respected; infeasible targets yield a typed error | [x] |
| 3 | Explanations | Shadow prices (duals) from the final tableau; test: duals satisfy strong duality (`b·y = c·x`); `explain(plan)` names the binding targets and marginal cost per unit; diet presets (vegetarian, vegan) filter foods | [x] |
| 4 | UI v1 + Pages | Targets form, food list, plan table with cost; empty state for first-time users; error state for infeasible; `pages.yml` deploys and the live link works; Enter solves | [~] UI done and tested; live link unverified until first Pages run |
| 5 | Design system + mobile | CSS tokens (spacing, type scale, colours) with light/dark; usable at 360 px width; keyboard shortcuts (`/` focus, `Enter` solve, `?` help); landing section; loading state | [x] logic unit-tested; 360 px layout and visuals not checked in a real browser until Day 6 e2e |
| 6 | E2E + performance | Playwright tests for: first-run empty state, solve preset, infeasible message, dark mode toggle; benchmark: 200-food plan solves under 50 ms (asserted); added to CI | [x] e2e runs in a separate CI job (needs a browser), not in `check.sh` |
| 7 | Polish + docs | Custom foods saved in localStorage, shareable URL for targets, screenshots in README, final README/WORKLOG review, a11y pass (axe in Playwright) with zero serious violations | [~] shareable URL done (e2e unverified locally); custom foods, screenshots, axe pending |

## Stretch
- Whole-serving rounding via branch-and-bound
- Weekly plan with variety constraints (max repeats)
- Export grocery list
