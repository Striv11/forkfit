import { describe, expect, it } from "vitest";
import { solve, withUpperBounds, type Problem } from "../src/solver/simplex";

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("simplex", () => {
  it("solves a textbook maximisation (as minimisation of the negative)", () => {
    // max 3x + 5y  s.t. x<=4, 2y<=12, 3x+2y<=18  -> (2,6), value 36
    const p: Problem = {
      c: [-3, -5],
      constraints: [
        { a: [1, 0], op: "<=", b: 4 },
        { a: [0, 2], op: "<=", b: 12 },
        { a: [3, 2], op: "<=", b: 18 },
      ],
    };
    const s = solve(p);
    expect(s.status).toBe("optimal");
    near(s.x[0]!, 2);
    near(s.x[1]!, 6);
    near(s.objective, -36);
  });

  it("handles >= constraints (the classic diet problem)", () => {
    // min 2x + 3y  s.t. x + y >= 4, x + 3y >= 6 -> (3,1), cost 9
    const s = solve({
      c: [2, 3],
      constraints: [
        { a: [1, 1], op: ">=", b: 4 },
        { a: [1, 3], op: ">=", b: 6 },
      ],
    });
    expect(s.status).toBe("optimal");
    near(s.x[0]!, 3);
    near(s.x[1]!, 1);
    near(s.objective, 9);
  });

  it("handles equality constraints", () => {
    const s = solve({
      c: [1, 2],
      constraints: [{ a: [1, 1], op: "=", b: 5 }],
    });
    expect(s.status).toBe("optimal");
    near(s.x[0]!, 5);
    near(s.objective, 5);
  });

  it("flips rows with a negative right-hand side", () => {
    // -x <= -2  is  x >= 2
    const s = solve({ c: [1], constraints: [{ a: [-1], op: "<=", b: -2 }] });
    expect(s.status).toBe("optimal");
    near(s.x[0]!, 2);
  });

  it("detects infeasibility", () => {
    const s = solve({
      c: [1],
      constraints: [
        { a: [1], op: "<=", b: 1 },
        { a: [1], op: ">=", b: 2 },
      ],
    });
    expect(s.status).toBe("infeasible");
    expect(s.x).toEqual([]);
  });

  it("detects unboundedness", () => {
    const s = solve({
      c: [-1, 0],
      constraints: [{ a: [0, 1], op: "<=", b: 3 }],
    });
    expect(s.status).toBe("unbounded");
  });

  it("tolerates redundant equality rows", () => {
    const s = solve({
      c: [1, 1],
      constraints: [
        { a: [1, 1], op: "=", b: 4 },
        { a: [2, 2], op: "=", b: 8 },
      ],
    });
    expect(s.status).toBe("optimal");
    near(s.objective, 4);
  });

  it("terminates on a degenerate problem (Beale's cycling example)", () => {
    // min -3/4 x4 + 20 x5 - 1/2 x6 + 6 x7 ; cycles under naive Dantzig with bad tie-breaks
    const s = solve({
      c: [-0.75, 20, -0.5, 6],
      constraints: [
        { a: [0.25, -8, -1, 9], op: "<=", b: 0 },
        { a: [0.5, -12, -0.5, 3], op: "<=", b: 0 },
        { a: [0, 0, 1, 0], op: "<=", b: 1 },
      ],
    });
    expect(s.status).toBe("optimal");
    near(s.objective, -1.25);
  });

  it("applies upper bounds", () => {
    const base: Problem = {
      c: [-1, -1],
      constraints: [{ a: [1, 1], op: "<=", b: 10 }],
    };
    const s = solve(withUpperBounds(base, [3, Infinity]));
    expect(s.status).toBe("optimal");
    near(s.objective, -10);
    expect(s.x[0]!).toBeLessThanOrEqual(3 + 1e-9);
  });

  it("rejects malformed input", () => {
    expect(() => solve({ c: [], constraints: [] })).toThrow();
    expect(() =>
      solve({ c: [1], constraints: [{ a: [1, 2], op: "<=", b: 1 }] }),
    ).toThrow(/coefficients/);
    expect(() =>
      solve({ c: [1], constraints: [{ a: [NaN], op: "<=", b: 1 }] }),
    ).toThrow(/non-finite/);
  });

  it("matches brute-force vertex enumeration on random small LPs", () => {
    let seed = 42;
    const rnd = () =>
      (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let trial = 0; trial < 60; trial++) {
      // min c·x, A x >= b, x <= 10 in 2D; compare with grid-refined vertex search.
      const c = [rnd() * 5 + 0.1, rnd() * 5 + 0.1];
      const cons = Array.from({ length: 3 }, () => ({
        a: [rnd() * 3, rnd() * 3],
        op: ">=" as const,
        b: rnd() * 8,
      }));
      const p = withUpperBounds({ c, constraints: cons }, [10, 10]);
      const s = solve(p);
      const lines = [
        ...p.constraints.map((k) => ({ a: k.a, b: k.b })),
        { a: [1, 0], b: 0 },
        { a: [0, 1], b: 0 },
      ];
      let best = Infinity;
      const ok = (x: number, y: number) =>
        x >= -1e-9 &&
        y >= -1e-9 &&
        p.constraints.every((k) => {
          const v = k.a[0]! * x + k.a[1]! * y;
          return k.op === ">=" ? v >= k.b - 1e-7 : v <= k.b + 1e-7;
        });
      for (let i = 0; i < lines.length; i++)
        for (let j = i + 1; j < lines.length; j++) {
          const [l1, l2] = [lines[i]!, lines[j]!];
          const det = l1.a[0]! * l2.a[1]! - l1.a[1]! * l2.a[0]!;
          if (Math.abs(det) < 1e-12) continue;
          const x = (l1.b * l2.a[1]! - l1.a[1]! * l2.b) / det;
          const y = (l1.a[0]! * l2.b - l1.b * l2.a[0]!) / det;
          if (ok(x, y)) best = Math.min(best, c[0]! * x + c[1]! * y);
        }
      if (best === Infinity) expect(s.status).toBe("infeasible");
      else {
        expect(s.status).toBe("optimal");
        expect(s.objective).toBeCloseTo(best, 5);
      }
    }
  });
});
