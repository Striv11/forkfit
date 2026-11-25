import type { Diet } from "../model/foods";
import type { Limits, Targets } from "../model/model";

/** Raw text values as typed into the form. */
export interface FormValues {
  calories: string;
  protein: string;
  fibre: string;
  sodiumMax: string;
  budget: string;
  diet: string;
  maxServings: string;
}

export interface Preset {
  id: string;
  label: string;
  values: FormValues;
}

export const PRESETS: Preset[] = [
  {
    id: "balanced",
    label: "2000 kcal, 100 g protein, $8/day",
    values: {
      calories: "2000",
      protein: "100",
      fibre: "30",
      sodiumMax: "2300",
      budget: "8",
      diet: "omnivore",
      maxServings: "4",
    },
  },
  {
    id: "vegan",
    label: "Vegan, 2200 kcal, 80 g protein, $7/day",
    values: {
      calories: "2200",
      protein: "80",
      fibre: "35",
      sodiumMax: "2300",
      budget: "7",
      diet: "vegan",
      maxServings: "4",
    },
  },
  {
    id: "impossible",
    label: "Impossible: 1200 kcal, 400 g protein",
    values: {
      calories: "1200",
      protein: "400",
      fibre: "30",
      sodiumMax: "1500",
      budget: "5",
      diet: "vegan",
      maxServings: "1",
    },
  },
];

export interface ParsedForm {
  targets: Targets;
  diet: Diet;
  limits: Limits;
  /** Daily budget in USD, if given. */
  budget?: number;
}

export type ParseResult =
  | { ok: true; value: ParsedForm }
  | { ok: false; errors: Partial<Record<keyof FormValues, string>> };

const LABELS: Record<string, string> = {
  calories: "Calories",
  protein: "Protein",
  fibre: "Fibre",
  sodiumMax: "Sodium limit",
  budget: "Budget",
  maxServings: "Max servings",
};

/** Parses an optional non-negative number; "" means "not set". */
function optional(
  raw: string,
  key: keyof FormValues,
  errors: Partial<Record<keyof FormValues, string>>,
): number | undefined {
  const s = raw.trim();
  if (s === "") return undefined;
  const v = Number(s);
  if (!Number.isFinite(v) || v < 0) {
    errors[key] = `${LABELS[key] ?? key} must be a number, 0 or more.`;
    return undefined;
  }
  return v;
}

/** Validates form text and turns it into model inputs. */
export function parseForm(values: FormValues): ParseResult {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  const calories = optional(values.calories, "calories", errors);
  const protein = optional(values.protein, "protein", errors);
  const fibre = optional(values.fibre, "fibre", errors);
  const sodiumMax = optional(values.sodiumMax, "sodiumMax", errors);
  const budget = optional(values.budget, "budget", errors);
  const maxServings = optional(values.maxServings, "maxServings", errors);
  if (maxServings !== undefined && maxServings < 0.5)
    errors.maxServings = "Max servings must be at least 0.5.";
  const diet = values.diet as Diet;
  if (!["vegan", "vegetarian", "omnivore"].includes(diet))
    errors.diet = "Pick a diet.";
  if (
    calories === undefined &&
    protein === undefined &&
    fibre === undefined &&
    sodiumMax === undefined &&
    Object.keys(errors).length === 0
  )
    errors.calories = "Set at least one target.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const targets: Targets = {};
  // Calories are a band: hitting the target within 5% either way.
  if (calories !== undefined)
    targets.calories = { min: calories * 0.95, max: calories * 1.05 };
  if (protein !== undefined) targets.protein = { min: protein };
  if (fibre !== undefined) targets.fibre = { min: fibre };
  if (sodiumMax !== undefined) targets.sodium = { max: sodiumMax };
  const value: ParsedForm = {
    targets,
    diet,
    limits: maxServings !== undefined ? { maxServings } : {},
  };
  if (budget !== undefined) value.budget = budget;
  return { ok: true, value };
}
