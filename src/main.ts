import { FOODS } from "./model/foods";
import { filterByDiet } from "./model/explain";
import { planMeal } from "./model/model";
import {
  PRESETS,
  formToQuery,
  parseForm,
  queryToForm,
  type FormValues,
} from "./ui/form";
import { esc, renderEmpty, renderResult } from "./ui/view";
import {
  renderHelp,
  renderLanding,
  renderLoading,
  resolveTheme,
  shortcutAction,
} from "./ui/shortcuts";
import "./ui/style.css";

const THEME_KEY = "forkfit-theme";
const applyTheme = (t: string) => {
  document.documentElement.dataset.theme = t;
};
const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(resolveTheme(localStorage.getItem(THEME_KEY), systemDark()));

const FIELDS: { key: keyof FormValues; label: string; hint: string }[] = [
  { key: "calories", label: "Calories (kcal, ±5%)", hint: "2000" },
  { key: "protein", label: "Protein min (g)", hint: "100" },
  { key: "fibre", label: "Fibre min (g)", hint: "30" },
  { key: "sodiumMax", label: "Sodium max (mg)", hint: "2300" },
  { key: "budget", label: "Budget ($/day)", hint: "8" },
  { key: "maxServings", label: "Max servings per food", hint: "4" },
];

const app = document.getElementById("app");
if (app) {
  app.innerHTML = `<header><h1>forkfit</h1>
    <div class="toolbar">
      <button type="button" id="help-btn" aria-label="Keyboard shortcuts (?)">?</button>
      <button type="button" id="theme-btn" aria-label="Toggle dark mode">◐</button>
    </div>
    <p>Cheapest meal plan that hits your targets. Runs entirely in your browser.</p></header>
    <form id="form" novalidate>
      <label>Preset
        <select id="preset"><option value="">Choose a preset…</option>
        ${PRESETS.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join("")}</select>
      </label>
      ${FIELDS.map(
        (f) => `<label>${f.label}
          <input name="${f.key}" inputmode="decimal" placeholder="${f.hint}" aria-describedby="err-${f.key}" />
          <span class="field-error" id="err-${f.key}"></span></label>`,
      ).join("")}
      <label>Diet
        <select name="diet"><option value="omnivore">Anything</option>
        <option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option></select>
      </label>
      <button type="submit">Plan my day</button>
    </form>
    <section id="result" aria-live="polite">${renderEmpty()}</section>
    ${renderLanding()}${renderHelp()}`;

  const form = document.getElementById("form") as HTMLFormElement;
  const result = document.getElementById("result") as HTMLElement;

  const read = (): FormValues => {
    const out: Record<string, string> = {};
    for (const el of Array.from(form.elements)) {
      if (
        (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) &&
        el.name
      )
        out[el.name] = el.value;
    }
    return out as unknown as FormValues;
  };

  document.getElementById("preset")?.addEventListener("change", (ev) => {
    const preset = PRESETS.find(
      (p) => p.id === (ev.target as HTMLSelectElement).value,
    );
    if (!preset) return;
    for (const [k, v] of Object.entries(preset.values)) {
      const el = form.elements.namedItem(k);
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement)
        el.value = v;
    }
    form.requestSubmit();
  });

  const help = document.getElementById("help") as HTMLDialogElement;
  document
    .getElementById("help-btn")
    ?.addEventListener("click", () => help.showModal());
  document.getElementById("theme-btn")?.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
  document.addEventListener("keydown", (ev) => {
    const t = ev.target;
    const typing =
      t instanceof HTMLInputElement ||
      t instanceof HTMLSelectElement ||
      t instanceof HTMLTextAreaElement;
    const action = shortcutAction(ev, typing);
    if (action === "focus-form") {
      ev.preventDefault();
      form.querySelector<HTMLElement>("input")?.focus();
    } else if (action === "help") {
      ev.preventDefault();
      if (!help.open) help.showModal();
    } else if (action === "close-help" && help.open) help.close();
  });

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    for (const f of FIELDS) {
      const slot = document.getElementById(`err-${f.key}`);
      if (slot) slot.textContent = "";
    }
    const parsed = parseForm(read());
    if (!parsed.ok) {
      for (const [k, msg] of Object.entries(parsed.errors)) {
        const slot = document.getElementById(`err-${k}`);
        if (slot) slot.textContent = msg;
      }
      result.innerHTML = renderEmpty();
      return;
    }
    const { targets, diet, limits, budget } = parsed.value;
    history.replaceState(null, "", `?${formToQuery(read())}`);
    result.innerHTML = renderLoading();
    // Yield so the loading state paints before the (synchronous) solve.
    setTimeout(() => {
      const r = planMeal(filterByDiet(FOODS, diet), targets, limits);
      result.innerHTML = renderResult(r, budget);
    }, 0);
  });

  // Shareable URL: prefill from the query string and solve straight away.
  const shared = queryToForm(location.search);
  if (shared) {
    for (const [k, v] of Object.entries(shared)) {
      const el = form.elements.namedItem(k);
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement)
        el.value = v;
    }
    form.requestSubmit();
  }
}
