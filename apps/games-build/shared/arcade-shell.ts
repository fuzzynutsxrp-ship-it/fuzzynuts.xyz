/**
 * arcade-shell — the single nav bar / postMessage bridge bundled into
 * every iframe game. Replaces the hand-copied per-game inline nav that
 * the audit flagged as a drift source.
 *
 * Responsibilities:
 *   - Receive FUZZY_CONFIG postMessage from the parent (web-arcade modal)
 *     and suppress in-game nav if hideNav is true.
 *   - Forward score events / mute toggles to the parent.
 */

export interface FuzzyConfig {
  readonly hideNav?: boolean;
  readonly parentOrigin?: string;
}

export interface ArcadeShellOptions {
  readonly navSelectors?: readonly string[];
}

const DEFAULT_NAV_SELECTORS = [
  ".game-nav",
  ".inner-header",
  "[data-nav]",
  "header.game-ui",
  ".game-header",
  ".game-breadcrumb",
  ".back-to-arcade",
  "#fuzzyNav",
];

export function installArcadeShell(opts: ArcadeShellOptions = {}): void {
  if (typeof window === "undefined") return;
  if (window.parent === window) return; // not embedded — skip

  const selectors = opts.navSelectors ?? DEFAULT_NAV_SELECTORS;

  function hideNav(): void {
    for (const sel of selectors) {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        el.style.setProperty("display", "none", "important");
      });
    }
  }

  window.addEventListener("message", (event: MessageEvent) => {
    const data = event.data as { type?: string } & FuzzyConfig;
    if (data?.type !== "FUZZY_CONFIG") return;
    // ── Origin validation: only accept config from trusted parent ──
    const origin = event.origin;
    const allowed = ["https://fuzzynuts.xyz", "https://www.fuzzynuts.xyz"];
    if (
      typeof window !== "undefined" &&
      origin !== window.location.origin &&
      !allowed.includes(origin)
    )
      return;
    // Store parent origin for outbound messages
    if (data.parentOrigin) _parentOrigin = data.parentOrigin;
    if (data.hideNav) {
      hideNav();
      setTimeout(hideNav, 500);
      setTimeout(hideNav, 2000);
    }
  });
}

/** Stored parent origin from FUZZY_CONFIG handshake — used as postMessage target. */
let _parentOrigin: string = "*";

/** Notify the parent that the game just emitted a score event. */
export function emitScoreEvent(payload: { game: string; score: number; duration: number }): void {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage({ type: "FUZZY_SCORE_SUBMITTED", ...payload }, _parentOrigin);
}
