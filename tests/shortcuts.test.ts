import { describe, expect, it } from "vitest";
import {
  renderHelp,
  renderLanding,
  renderLoading,
  resolveTheme,
  shortcutAction,
} from "../src/ui/shortcuts";

describe("shortcutAction", () => {
  it("maps / and ? when not typing", () => {
    expect(shortcutAction({ key: "/" }, false)).toBe("focus-form");
    expect(shortcutAction({ key: "?" }, false)).toBe("help");
  });
  it("ignores / and ? while typing in a field", () => {
    expect(shortcutAction({ key: "/" }, true)).toBeNull();
    expect(shortcutAction({ key: "?" }, true)).toBeNull();
  });
  it("Escape closes help even while typing", () => {
    expect(shortcutAction({ key: "Escape" }, true)).toBe("close-help");
  });
  it("ignores browser shortcuts with modifiers", () => {
    expect(shortcutAction({ key: "/", ctrlKey: true }, false)).toBeNull();
    expect(shortcutAction({ key: "?", metaKey: true }, false)).toBeNull();
  });
  it("ignores other keys", () => {
    expect(shortcutAction({ key: "a" }, false)).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("prefers a stored choice", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("falls back to the system preference, ignoring junk", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("purple", false)).toBe("light");
  });
});

describe("static sections", () => {
  it("landing, help and loading render their key content", () => {
    expect(renderLanding()).toContain("simplex");
    expect(renderHelp()).toContain("<dialog");
    expect(renderHelp()).toContain("<kbd>/</kbd>");
    expect(renderLoading()).toContain('data-state="loading"');
  });
});
