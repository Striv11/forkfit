import { NUTRIENTS, NUTRIENT_UNITS } from "../model/foods";
import { explain } from "../model/explain";
import type { PlanResult } from "../model/model";

export function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? c,
  );
}

const usd = (v: number) => `$${v.toFixed(2)}`;
const num = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));

/** Shown before the first solve. */
export function renderEmpty(): string {
  return `<div class="empty" data-state="empty">
    <h2>No plan yet</h2>
    <p>Enter your daily targets (or pick a preset) and press <kbd>Enter</kbd> or <strong>Plan my day</strong>.</p>
  </div>`;
}

/** Renders a solver outcome as HTML: plan table, or an error state. */
export function renderResult(result: PlanResult, budget?: number): string {
  if (!result.ok) {
    const e = result.error;
    const msg =
      e.kind === "no-foods"
        ? "No foods match your diet."
        : e.kind === "invalid-input"
          ? e.message
          : e.message;
    const hint =
      e.kind === "infeasible"
        ? "Try lowering a target, raising the serving cap, or relaxing the diet."
        : "";
    return `<div class="error" role="alert" data-state="error">
      <h2>Can't build that plan</h2><p>${esc(msg)}</p>${hint ? `<p>${esc(hint)}</p>` : ""}
    </div>`;
  }
  const { plan } = result;
  const rows = [...plan.lines]
    .sort((a, b) => b.cost - a.cost)
    .map(
      (l) =>
        `<tr><th scope="row">${esc(l.food.name)}<small>${esc(l.food.serving)}</small></th><td>${num(l.servings)}</td><td>${usd(l.cost)}</td></tr>`,
    )
    .join("");
  const totals = NUTRIENTS.map(
    (n) =>
      `<tr><th scope="row">${n}</th><td>${num(plan.totals[n] ?? 0)} ${NUTRIENT_UNITS[n]}</td></tr>`,
  ).join("");
  const over = budget !== undefined && plan.cost > budget + 1e-9;
  const budgetNote =
    budget === undefined
      ? ""
      : over
        ? `<p class="warn" role="status">The cheapest plan costs ${usd(plan.cost)}, which is ${usd(plan.cost - budget)} over your ${usd(budget)} budget.</p>`
        : `<p class="ok" role="status">Within your ${usd(budget)} budget.</p>`;
  const why = explain(plan)
    .summary.map((s) => `<li>${esc(s)}</li>`)
    .join("");
  return `<div data-state="plan">
    <h2>Cheapest plan: <span class="cost">${usd(plan.cost)}</span>/day</h2>
    ${budgetNote}
    <table><caption>Foods</caption><thead><tr><th>Food</th><th>Servings</th><th>Cost</th></tr></thead><tbody>${rows}</tbody></table>
    <table><caption>Nutrient totals</caption><tbody>${totals}</tbody></table>
    <h3>Why this plan?</h3><ul>${why}</ul>
  </div>`;
}
