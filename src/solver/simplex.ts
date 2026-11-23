/**
 * Two-phase tableau simplex, written from scratch.
 *
 * Solves   minimize c·x   subject to   A x {<=,>=,=} b,   x >= 0.
 * Variable upper bounds are expressed as ordinary `<=` rows by the caller
 * (see `withUpperBounds`). Dense tableau: fine for the few dozen foods and
 * nutrient rows a meal plan needs.
 */

export type Relation = "<=" | ">=" | "=";

export interface Constraint {
  /** Coefficients, one per variable. */
  a: number[];
  op: Relation;
  b: number;
}

export interface Problem {
  /** Objective coefficients to minimize, one per variable. */
  c: number[];
  constraints: Constraint[];
}

export type Status = "optimal" | "infeasible" | "unbounded";

export interface Solution {
  status: Status;
  /** Variable values (empty unless optimal). */
  x: number[];
  /** Objective value c·x (NaN unless optimal). */
  objective: number;
  iterations: number;
}

const EPS = 1e-9;
/** Pivots without objective progress before switching to Bland's rule. */
const STALL_LIMIT = 30;

/** Returns a copy of `p` with `x_j <= upper[j]` rows added (Infinity = none). */
export function withUpperBounds(p: Problem, upper: number[]): Problem {
  const n = p.c.length;
  const extra: Constraint[] = [];
  upper.forEach((u, j) => {
    if (Number.isFinite(u)) {
      const a = new Array<number>(n).fill(0);
      a[j] = 1;
      extra.push({ a, op: "<=", b: u });
    }
  });
  return { c: p.c, constraints: [...p.constraints, ...extra] };
}

function validate(p: Problem): void {
  const n = p.c.length;
  if (n === 0) throw new Error("problem has no variables");
  for (const v of p.c)
    if (!Number.isFinite(v))
      throw new Error("non-finite objective coefficient");
  for (const [i, row] of p.constraints.entries()) {
    if (row.a.length !== n)
      throw new Error(
        `constraint ${i} has ${row.a.length} coefficients, expected ${n}`,
      );
    if (!Number.isFinite(row.b) || row.a.some((v) => !Number.isFinite(v))) {
      throw new Error(`constraint ${i} has a non-finite value`);
    }
  }
}

class Tableau {
  /** rows[0..m-1] are constraints; each has `cols` coefficients then the rhs. */
  readonly rows: number[][];
  readonly basis: number[];
  /** Reduced-cost row followed by (negated) objective value. */
  z: number[];
  iterations = 0;

  constructor(
    rows: number[][],
    basis: number[],
    readonly cols: number,
  ) {
    this.rows = rows;
    this.basis = basis;
    this.z = new Array<number>(cols + 1).fill(0);
  }

  /** Install a cost vector and price out the current basis. */
  setCosts(cost: number[]): void {
    const z = new Array<number>(this.cols + 1).fill(0);
    for (let j = 0; j < this.cols; j++) z[j] = cost[j] ?? 0;
    this.rows.forEach((row, i) => {
      const cb = cost[this.basis[i]!] ?? 0;
      if (cb !== 0) for (let j = 0; j <= this.cols; j++) z[j]! -= cb * row[j]!;
    });
    this.z = z;
  }

  get objective(): number {
    return -this.z[this.cols]!;
  }

  pivot(r: number, col: number): void {
    const row = this.rows[r]!;
    const p = row[col]!;
    for (let j = 0; j <= this.cols; j++) row[j]! /= p;
    row[col] = 1;
    const eliminate = (target: number[]) => {
      const f = target[col]!;
      if (f === 0) return;
      for (let j = 0; j <= this.cols; j++) target[j]! -= f * row[j]!;
      target[col] = 0;
    };
    for (const [i, other] of this.rows.entries()) if (i !== r) eliminate(other);
    eliminate(this.z);
    this.basis[r] = col;
    this.iterations++;
  }

  /** Optimize over columns < `limit`. Returns false if unbounded. */
  optimize(limit: number): boolean {
    let stall = 0;
    let last = this.objective;
    for (;;) {
      const bland = stall >= STALL_LIMIT;
      let enter = -1;
      let best = -EPS;
      for (let j = 0; j < limit; j++) {
        const v = this.z[j]!;
        if (v < best) {
          enter = j;
          best = v;
          if (bland) break; // first improving column = smallest index
        }
      }
      if (enter < 0) return true;

      let leave = -1;
      let minRatio = Infinity;
      for (const [i, row] of this.rows.entries()) {
        const a = row[enter]!;
        if (a <= EPS) continue;
        const ratio = row[this.cols]! / a;
        if (
          ratio < minRatio - EPS ||
          (Math.abs(ratio - minRatio) <= EPS &&
            leave >= 0 &&
            this.basis[i]! < this.basis[leave]!)
        ) {
          minRatio = ratio;
          leave = i;
        }
      }
      if (leave < 0) return false;

      this.pivot(leave, enter);
      const now = this.objective;
      stall = now < last - EPS ? 0 : stall + 1;
      last = now;
    }
  }
}

export function solve(problem: Problem): Solution {
  validate(problem);
  const n = problem.c.length;
  const m = problem.constraints.length;

  // Normalise to b >= 0, flipping the relation when a row is negated.
  const norm = problem.constraints.map((k) => {
    if (k.b >= 0) return { ...k };
    const op: Relation = k.op === "<=" ? ">=" : k.op === ">=" ? "<=" : "=";
    return { a: k.a.map((v) => -v), op, b: -k.b };
  });

  const slackCount = norm.filter((k) => k.op !== "=").length;
  const artCount = norm.filter((k) => k.op !== "<=").length;
  const cols = n + slackCount + artCount;
  const artStart = n + slackCount;

  const rows: number[][] = [];
  const basis: number[] = [];
  let s = n;
  let art = artStart;
  for (const k of norm) {
    const row = new Array<number>(cols + 1).fill(0);
    k.a.forEach((v, j) => (row[j] = v));
    row[cols] = k.b;
    if (k.op === "<=") {
      row[s] = 1;
      basis.push(s++);
    } else if (k.op === ">=") {
      row[s++] = -1;
      row[art] = 1;
      basis.push(art++);
    } else {
      row[art] = 1;
      basis.push(art++);
    }
    rows.push(row);
  }

  const fail = (status: Status, t: Tableau): Solution => ({
    status,
    x: [],
    objective: NaN,
    iterations: t.iterations,
  });
  const t = new Tableau(rows, basis, cols);

  // Phase 1: minimize the sum of artificial variables.
  if (artCount > 0) {
    const cost = new Array<number>(cols).fill(0);
    for (let j = artStart; j < cols; j++) cost[j] = 1;
    t.setCosts(cost);
    t.optimize(cols);
    const scale = 1 + Math.max(0, ...norm.map((k) => k.b));
    if (t.objective > 1e-7 * scale) return fail("infeasible", t);

    // Pivot remaining (zero-valued) artificials out of the basis when possible.
    for (let i = 0; i < m; i++) {
      if (t.basis[i]! < artStart) continue;
      const col = t.rows[i]!.slice(0, artStart).findIndex(
        (v) => Math.abs(v) > 1e-7,
      );
      if (col >= 0) t.pivot(i, col);
      // Otherwise the row is redundant: it stays basic at zero and is inert.
    }
  }

  // Phase 2: the real objective, never letting artificials re-enter.
  const cost = new Array<number>(cols).fill(0);
  problem.c.forEach((v, j) => (cost[j] = v));
  t.setCosts(cost);
  if (!t.optimize(artStart)) return fail("unbounded", t);

  const x = new Array<number>(n).fill(0);
  t.basis.forEach((b, i) => {
    if (b < n) x[b] = Math.max(0, t.rows[i]![cols]!);
  });
  const objective = problem.c.reduce((acc, v, j) => acc + v * x[j]!, 0);
  return { status: "optimal", x, objective, iterations: t.iterations };
}
