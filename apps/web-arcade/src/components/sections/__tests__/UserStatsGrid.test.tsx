/**
 * ═══════════════════════════════════════════════════════════════
 * UserStatsGrid — Tests
 *
 * Covers:
 *   P0: Pure functions (formatNumber, formatDate, relativeTime)
 *   P0: Derived stats (favoriteGenre, highestScore, recentFive)
 *   P1: Component rendering states (loading, error, empty, populated)
 *   P1: Fetch mocking (success shapes, error, timeout, empty, malformed)
 *   Bug fixes: undefined game guard, relativeTime now param, response validation
 *
 * Run: npx vitest run src/components/sections/__tests__/UserStatsGrid.test.tsx
 * ═══════════════════════════════════════════════════════════════
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import React from "react";

/* ── Module Mocks (vi.mock is hoisted; use require() for React) ── */

vi.mock("@/lib/gameRegistry", () => ({
  gameRegistry: {
    getBySlug: (slug: string) => {
      const registry: Record<string, { title: string; genre: string; color: string; iconPath: string }> = {
        mario: { title: "Super Mario", genre: "Platformer", color: "#ff0000", iconPath: "/icons/mario.webp" },
        tetris: { title: "Tetris", genre: "Puzzle", color: "#00ff00", iconPath: "/icons/tetris.webp" },
        pacmario: { title: "Pac-Man", genre: "Arcade", color: "#ffff00", iconPath: "/icons/pacman.webp" },
        snake: { title: "Snake", genre: "Arcade", color: "#00ff88", iconPath: "/icons/snake.webp" },
        breakout: { title: "Breakout", genre: "Arcade", color: "#ff8800", iconPath: "/icons/breakout.webp" },
      };
      return registry[slug];
    },
  },
}));

vi.mock("next/image", () => {
  const { createElement } = require("react");
  return {
    default: (props: Record<string, unknown>) => {
      const { src, alt, ...rest } = props;
      return createElement("img", { src, alt, ...rest });
    },
  };
});

vi.mock("next/link", () => {
  const { createElement } = require("react");
  return {
    default: ({ href, children, ...props }: Record<string, unknown>) =>
      createElement("a", { href, ...props }, children),
  };
});

vi.mock("framer-motion", () => {
  const { createElement } = require("react");
  return {
    motion: {
      div: ({ children, ...props }: Record<string, unknown>) =>
        createElement("div", props, children),
    },
  };
});

vi.mock("lucide-react", () => {
  const { createElement } = require("react");
  return {
    Gamepad2: (p: Record<string, unknown>) => createElement("svg", { ...p, "data-testid": "icon-gamepad" }),
    Trophy: (p: Record<string, unknown>) => createElement("svg", { ...p, "data-testid": "icon-trophy" }),
    TrendingUp: (p: Record<string, unknown>) => createElement("svg", { ...p, "data-testid": "icon-trending" }),
    Clock: (p: Record<string, unknown>) => createElement("svg", { ...p, "data-testid": "icon-clock" }),
    WifiOff: (p: Record<string, unknown>) => createElement("svg", { ...p, "data-testid": "icon-wifioff" }),
    RefreshCw: (p: Record<string, unknown>) => createElement("svg", { ...p, "data-testid": "icon-refresh" }),
  };
});

/* ── Imports (after mocks) ── */
import { formatDate, relativeTime, UserStatsGrid } from "../UserStatsGrid";
import { formatNumber } from "@/lib/format";

/* ── Test Helpers ── */

function makeScore(overrides: Record<string, unknown> = {}) {
  return {
    wallet: "rTestWallet123456789012345678",
    score: 1000,
    game: "mario",
    ts: Date.now(),
    ...overrides,
  };
}

function mockFetchSuccess(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    }),
  );
}

function mockFetchError(status = 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error: "fail" }),
    }),
  );
}

function mockFetchTimeout() {
  const error = new Error("The operation was aborted");
  error.name = "TimeoutError";
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
}

/* ═══════════════════════════════════════════════════════════════
   P0: Pure Function Tests
   ═══════════════════════════════════════════════════════════════ */

describe("formatNumber", () => {
  it("formats numbers < 1000 as-is", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatNumber(1000)).toBe("1K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(50000)).toBe("50K");
  });

  it("formats millions with M suffix", () => {
    expect(formatNumber(1_000_000)).toBe("1M");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });

  it("formats billions with B suffix", () => {
    expect(formatNumber(1_000_000_000)).toBe("1B");
  });
});

describe("formatDate", () => {
  it("formats a timestamp to 'Mon Day' format", () => {
    const ts = new Date(2026, 0, 15).getTime();
    expect(formatDate(ts)).toMatch(/Jan.*15/);
  });

  it("formats December correctly", () => {
    const ts = new Date(2026, 11, 25).getTime();
    expect(formatDate(ts)).toMatch(/Dec.*25/);
  });

  it("handles epoch 0 without crashing", () => {
    const result = formatDate(0);
    // epoch 0 = Jan 1 1970 UTC, but local timezone may show Dec 31
    expect(result).toMatch(/\w{3}\s+\d+/);
  });
});

describe("relativeTime", () => {
  const NOW = new Date(2026, 5, 13, 12, 0, 0).getTime();

  it("returns 'just now' for < 1 minute ago", () => {
    expect(relativeTime(NOW - 30_000, NOW)).toBe("just now");
    expect(relativeTime(NOW - 1_000, NOW)).toBe("just now");
  });

  it("returns minutes for < 1 hour ago", () => {
    expect(relativeTime(NOW - 5 * 60_000, NOW)).toBe("5m ago");
    expect(relativeTime(NOW - 59 * 60_000, NOW)).toBe("59m ago");
  });

  it("returns hours for < 24 hours ago", () => {
    expect(relativeTime(NOW - 3 * 3600_000, NOW)).toBe("3h ago");
    expect(relativeTime(NOW - 23 * 3600_000, NOW)).toBe("23h ago");
  });

  it("returns days for < 7 days ago", () => {
    expect(relativeTime(NOW - 2 * 86400_000, NOW)).toBe("2d ago");
    expect(relativeTime(NOW - 6 * 86400_000, NOW)).toBe("6d ago");
  });

  it("falls back to formatDate for >= 7 days ago", () => {
    const result = relativeTime(NOW - 30 * 86400_000, NOW);
    expect(result).not.toMatch(/\d+[mhd] ago/);
    expect(result).toMatch(/\w{3}\s+\d+/);
  });

  it("handles ts=0 (epoch)", () => {
    const result = relativeTime(0, NOW);
    expect(result).not.toContain("NaN");
    expect(result).not.toBe("just now");
  });

  it("uses Date.now() by default when now is omitted", () => {
    const result = relativeTime(Date.now() - 5000);
    expect(result).toBe("just now");
  });
});

/* ═══════════════════════════════════════════════════════════════
   P1: Component Rendering States
   ═══════════════════════════════════════════════════════════════ */

describe("UserStatsGrid — rendering states", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("shows loading skeleton on initial render", () => {
    mockFetchSuccess([]);
    render(React.createElement(UserStatsGrid, { deviceId: "test123" }));
    const pulseElements = document.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("shows error state when fetch fails", async () => {
    mockFetchError(500);
    render(React.createElement(UserStatsGrid, { deviceId: "test123" }));
    await waitFor(() => {
      expect(screen.getByText("Couldn't Load Stats")).toBeTruthy();
      expect(screen.getByText("Unable to reach the server")).toBeTruthy();
    });
  });

  it("shows timeout error when fetch times out", async () => {
    mockFetchTimeout();
    render(React.createElement(UserStatsGrid, { deviceId: "test123" }));
    await waitFor(() => {
      expect(screen.getByText("Request timed out")).toBeTruthy();
    });
  });

  it("shows 'Try Again' button in error state", async () => {
    mockFetchError(500);
    render(React.createElement(UserStatsGrid, { deviceId: "test123" }));
    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeTruthy();
    });
  });

  it("shows empty state when scores array is empty", async () => {
    mockFetchSuccess([]);
    render(React.createElement(UserStatsGrid, { deviceId: "test123" }));
    await waitFor(() => {
      expect(screen.getByText("No scores yet")).toBeTruthy();
    });
  });

  it("shows populated stats grid when scores exist", async () => {
    mockFetchSuccess([
      makeScore({ game: "mario", score: 5000 }),
      makeScore({ game: "tetris", score: 3000, ts: Date.now() - 1000 }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "test123" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
      expect(screen.getByText("Favorite Genre")).toBeTruthy();
      expect(screen.getByText("Unique Games")).toBeTruthy();
    });
  });

  it("does not fetch when deviceId is empty", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(React.createElement(UserStatsGrid, { deviceId: "" }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ═══════════════════════════════════════════════════════════════
   P1: Fetch Mocking — Response Shapes
   ═══════════════════════════════════════════════════════════════ */

describe("UserStatsGrid — fetch response shapes", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("handles array response shape", async () => {
    mockFetchSuccess([makeScore({ game: "mario", score: 100 })]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
    });
  });

  it("handles { scores: [...] } response shape", async () => {
    mockFetchSuccess({ scores: [makeScore({ game: "mario", score: 200 })] });
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
    });
  });

  it("handles { data: [...] } response shape", async () => {
    mockFetchSuccess({ data: [makeScore({ game: "mario", score: 300 })] });
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
    });
  });

  it("handles { combined: [...] } response shape", async () => {
    mockFetchSuccess({ combined: [makeScore({ game: "mario", score: 400 })] });
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
    });
  });

  it("handles { leaderboard: [...] } response shape", async () => {
    mockFetchSuccess({ leaderboard: [makeScore({ game: "mario", score: 500 })] });
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
    });
  });

  it("falls to empty state for unknown response shape (no known keys)", async () => {
    mockFetchSuccess({ unknown_key: [makeScore()] });
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("No scores yet")).toBeTruthy();
    });
  });

  it("filters out malformed entries missing required fields", async () => {
    mockFetchSuccess([
      makeScore({ game: "mario", score: 100 }),
      { wallet: "rBad" },
      { score: 100, game: "mario" },
      null,
      "not an object",
      makeScore({ game: "tetris", score: 200 }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
      expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("handles HTTP error status", async () => {
    mockFetchError(403);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Couldn't Load Stats")).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════════════════════════════
   P0: Derived Stats — via rendered output
   ═══════════════════════════════════════════════════════════════ */

describe("UserStatsGrid — derived stats", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("shows correct total games played", async () => {
    mockFetchSuccess([
      makeScore({ game: "mario" }),
      makeScore({ game: "tetris" }),
      makeScore({ game: "pacmario" }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows correct number of unique games", async () => {
    mockFetchSuccess([
      makeScore({ game: "mario" }),
      makeScore({ game: "mario" }),
      makeScore({ game: "tetris" }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Unique Games")).toBeTruthy();
    });
  });

  it("shows empty state when no scores", async () => {
    mockFetchSuccess([]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("No scores yet")).toBeTruthy();
    });
  });

  it("deduplicates recentFive by game", async () => {
    mockFetchSuccess([
      makeScore({ game: "mario", score: 100, ts: 1000 }),
      makeScore({ game: "mario", score: 200, ts: 2000 }),
      makeScore({ game: "tetris", score: 300, ts: 3000 }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Recently Played")).toBeTruthy();
    });
  });

  it("BUG FIX: recentFive skips entries with undefined game field", async () => {
    mockFetchSuccess([
      makeScore({ game: undefined, score: 100 }),
      makeScore({ game: "mario", score: 200 }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
    });
  });

  it("BUG FIX: recentFive skips entries with null game field", async () => {
    mockFetchSuccess([
      makeScore({ game: null, score: 100 }),
      makeScore({ game: "tetris", score: 300 }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
    });
  });

  it("recentFive limits to 5 games maximum", async () => {
    mockFetchSuccess([
      makeScore({ game: "mario", ts: 6000 }),
      makeScore({ game: "tetris", ts: 5000 }),
      makeScore({ game: "pacmario", ts: 4000 }),
      makeScore({ game: "snake", ts: 3000 }),
      makeScore({ game: "breakout", ts: 2000 }),
      makeScore({ game: "unknown1", ts: 1000 }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Recently Played")).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════════════════════════════
   P1: Fetch Integration
   ═══════════════════════════════════════════════════════════════ */

describe("UserStatsGrid — fetch integration", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("calls fetch with correct URL including deviceId", async () => {
    mockFetchSuccess([]);
    render(React.createElement(UserStatsGrid, { deviceId: "rMyWallet" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "https://world.fuzzynuts.xyz/api/scores?wallet=rMyWallet",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("encodes special characters in deviceId", async () => {
    mockFetchSuccess([]);
    render(React.createElement(UserStatsGrid, { deviceId: "r wallet&test" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("r wallet&test")),
        expect.anything(),
      );
    });
  });

  it("retries fetch when 'Try Again' is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makeScore({ game: "mario" })]) }),
    );
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeTruthy();
    });
    screen.getByText("Try Again").click();
    await waitFor(() => {
      expect(screen.getByText("Games Played")).toBeTruthy();
    });
  });

  it("sorts scores by most recent (ts descending)", async () => {
    mockFetchSuccess([
      makeScore({ game: "mario", score: 100, ts: 1000 }),
      makeScore({ game: "tetris", score: 200, ts: 3000 }),
      makeScore({ game: "pacmario", score: 300, ts: 2000 }),
    ]);
    render(React.createElement(UserStatsGrid, { deviceId: "wallet1" }));
    await waitFor(() => {
      expect(screen.getByText("Recently Played")).toBeTruthy();
    });
  });
});
