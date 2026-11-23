import { solve } from "./solver/simplex";

// Day 1 placeholder: proves the solver bundles and runs in the browser.
// The real UI lands on Day 4 (see PLAN.md).
const demo = solve({
  c: [2, 3],
  constraints: [
    { a: [1, 1], op: ">=", b: 4 },
    { a: [1, 3], op: ">=", b: 6 },
  ],
});

const app = document.getElementById("app");
if (app) {
  app.innerHTML = `<h1>forkfit</h1>
    <p>Meal plans that hit your nutrition targets on a budget. UI coming soon.</p>
    <p>Solver self-test: ${demo.status}, cost ${demo.objective.toFixed(2)}.</p>`;
}
