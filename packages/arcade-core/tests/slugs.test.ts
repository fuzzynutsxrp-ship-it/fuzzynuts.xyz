import { describe, it, expect } from "vitest";
import {
  GAME_SLUGS,
  ID_TO_SLUG,
  SLUG_TO_LEGACY_ID,
  normalizeSlug,
  isGameSlug,
} from "../src/constants/slugs";

describe("slugs — single source of truth", () => {
  it("every canonical slug is also a key in ID_TO_SLUG (self-mapping)", () => {
    for (const slug of GAME_SLUGS) {
      expect(ID_TO_SLUG[slug]).toBe(slug);
    }
  });

  it("every canonical slug has a legacy id", () => {
    for (const slug of GAME_SLUGS) {
      expect(SLUG_TO_LEGACY_ID[slug]).toBeDefined();
    }
  });

  it("every legacy id round-trips back to a canonical slug", () => {
    for (const [slug, id] of Object.entries(SLUG_TO_LEGACY_ID) as Array<
      [keyof typeof SLUG_TO_LEGACY_ID, string]
    >) {
      expect(normalizeSlug(id)).toBe(slug);
    }
  });

  it("normalizes the historical `nutracer` typo to canonical `nut-racer`", () => {
    expect(normalizeSlug("nutracer")).toBe("nut-racer");
  });

  it("normalizes legacy `survivors` and `racer` ids to canonical slugs", () => {
    expect(normalizeSlug("survivors")).toBe("fuzzy-survivors");
    expect(normalizeSlug("racer")).toBe("nut-racer");
  });

  it("is case- and whitespace-insensitive on input", () => {
    expect(normalizeSlug("  Nut-Racer  ")).toBe("nut-racer");
    expect(normalizeSlug("FUZZY-SURVIVORS")).toBe("fuzzy-survivors");
  });

  it("returns null for unknown inputs (never silently falls through)", () => {
    expect(normalizeSlug("")).toBeNull();
    expect(normalizeSlug(null)).toBeNull();
    expect(normalizeSlug(undefined)).toBeNull();
    expect(normalizeSlug("not-a-game")).toBeNull();
  });

  it("isGameSlug() narrows correctly", () => {
    expect(isGameSlug("mario")).toBe(true);
    expect(isGameSlug("nutracer")).toBe(false); // typo is not canonical
    expect(isGameSlug(42)).toBe(false);
  });
});
