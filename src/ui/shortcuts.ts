export type ShortcutAction = "focus-form" | "help" | "close-help" | null;

export interface KeyLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * Maps a key press to an app action. `/` focuses the form and `?` opens help,
 * but neither fires while typing in a field. `Escape` always closes help.
 * (`Enter` to solve is handled natively by the form's submit.)
 */
export function shortcutAction(e: KeyLike, typing: boolean): ShortcutAction {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === "Escape") return "close-help";
  if (typing) return null;
  if (e.key === "/") return "focus-form";
  if (e.key === "?") return "help";
  return null;
}

export type Theme = "light" | "dark";

/** Stored choice wins; otherwise follow the system preference. */
export function resolveTheme(
  stored: string | null | undefined,
  systemDark: boolean,
): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return systemDark ? "dark" : "light";
}

export function renderLanding(): string {
  return `<section class="landing" aria-labelledby="landing-title">
    <h2 id="landing-title">The diet problem, solved in your browser</h2>
    <ul class="pillars">
      <li><strong>Cheapest plan</strong> that meets your calorie, protein, fibre and sodium targets.</li>
      <li><strong>Explains itself</strong>: shadow prices show which target costs you the most.</li>
      <li><strong>Private</strong>: a from-scratch simplex solver runs locally; nothing is uploaded.</li>
    </ul>
  </section>`;
}

export function renderHelp(): string {
  return `<dialog id="help" aria-labelledby="help-title">
    <h2 id="help-title">Keyboard shortcuts</h2>
    <dl>
      <dt><kbd>/</kbd></dt><dd>Jump to the targets form</dd>
      <dt><kbd>Enter</kbd></dt><dd>Plan my day</dd>
      <dt><kbd>?</kbd></dt><dd>Show this help</dd>
      <dt><kbd>Esc</kbd></dt><dd>Close this help</dd>
    </dl>
    <form method="dialog"><button>Close</button></form>
  </dialog>`;
}

export function renderLoading(): string {
  return `<div class="empty" data-state="loading" role="status"><p>Solving…</p></div>`;
}
