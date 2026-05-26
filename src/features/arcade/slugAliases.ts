/* ═══════════════════════════════════════════════════════════════
   Slug alias translation

   The frontend speaks canonical slugs (matching the folder names in
   public/games/ and the gameRegistry source of truth). The Railway
   backend's MongoDB collection still stores `game` fields under
   legacy/short slugs because that's what fuzzy-score.js has been
   POSTing for months.

   Rather than migrate the database (which would require backend
   coordination + downtime), we translate at the API boundary:
     • Going OUT (writes & query params): canonical → backend
     • Coming IN (response payloads): backend → canonical

   The `FROM_BACKEND` map also accepts the typo'd `nutracer` spelling
   that snuck into fuzzy-score.js for some entries. Once those are
   cleaned up and the backend has only canonical-shaped data, this
   whole module collapses to identity functions.
   ═══════════════════════════════════════════════════════════════ */

const TO_BACKEND: Record<string, string> = {
  "fuzzy-survivors": "survivors",
  "nut-racer": "racer",
};

const FROM_BACKEND: Record<string, string> = {
  survivors: "fuzzy-survivors",
  racer: "nut-racer",
  nutracer: "nut-racer",
};

/** Canonical (frontend/registry) slug → backend (Mongo) slug. Identity for already-aligned slugs. */
export function toBackendSlug(canonical: string): string {
  return TO_BACKEND[canonical] ?? canonical;
}

/** Backend (Mongo) slug → canonical (frontend/registry) slug. Identity for already-aligned slugs. */
export function fromBackendSlug(backend: string): string {
  return FROM_BACKEND[backend] ?? backend;
}
