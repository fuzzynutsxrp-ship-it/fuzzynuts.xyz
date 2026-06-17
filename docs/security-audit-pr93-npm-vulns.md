# Security Audit: PR #93 npm Vulnerabilities

**Date:** 2026-06-16
**Task:** t_c3993c01
**Auditor:** security-auditor (Hermes Agent)
**Scope:** 4 npm vulnerabilities found by `pnpm audit --audit-level moderate` on `eslint-10-compat-fix` branch

---

## Summary

| #   | Package   | Severity | Status    | Exploitable? | Fix Applied                 |
| --- | --------- | -------- | --------- | ------------ | --------------------------- |
| 1   | ws        | HIGH     | **FIXED** | Low          | Override bumped to >=8.21.0 |
| 2   | form-data | HIGH     | **FIXED** | Very Low     | Override added >=4.0.6      |
| 3   | tar       | MODERATE | **FIXED** | Very Low     | Override added >=7.5.16     |
| 4   | js-yaml   | MODERATE | **OPEN**  | Negligible   | Blocked (see below)         |

**Result: 3 of 4 vulnerabilities remediated. 1 moderate (js-yaml) accepted as documented risk.**

---

## Detailed Findings

### 1. ws — Memory exhaustion DoS (GHSA-96hv-2xvq-fx4p) — HIGH — FIXED

- **Vulnerable:** >=8.0.0 <8.21.0 | **Fix:** >=8.21.0
- **Installed:** 8.20.1 (502 transitive paths via socket.io, engine.io, @reown/appkit)
- **Attack vector:** A malicious client sends tiny WebSocket fragments or data chunks to exhaust server memory
- **Exploitability assessment:** LOW — The API server (`apps/api`) uses socket.io for real-time communication. An attacker would need to establish a WebSocket connection and send crafted fragments. The attack is network-accessible but requires sustained connection. Existing rate limiting and connection limits may partially mitigate.
- **Fix:** Bumped pnpm override `ws` from `>=8.20.1` to `>=8.21.0`. This is a patch-level update — no API changes, no compatibility risk.
- **Direct deps affected:** socket.io@4.8.3 (latest), @socket.io/redis-adapter@8.3.0

### 2. form-data — CRLF injection (GHSA-hmw2-7cc7-3qxx) — HIGH — FIXED

- **Vulnerable:** >=4.0.0 <4.0.6 | **Fix:** >=4.0.6
- **Installed:** 4.0.5 (26 transitive paths via supertest, axios, @reown/appkit)
- **Attack vector:** Unescaped CRLF characters in multipart field names/filenames allow header injection
- **Exploitability assessment:** VERY LOW — The primary path is through `supertest` (dev-only test dependency) and `axios` inside `@reown/appkit` (client-side wallet SDK). Neither path processes untrusted multipart uploads from external users in production.
- **Fix:** Added pnpm override `form-data: >=4.0.6`. Patch-level update from 4.0.5 → 4.0.6 — only the CRLF escaping fix, no breaking changes.

### 3. tar — File smuggling via PAX headers (GHSA-vmf3-w455-68vh) — MODERATE — FIXED

- **Vulnerable:** <=7.5.15 | **Fix:** >=7.5.16
- **Installed:** 7.5.15 (1 path: @capacitor/cli@7.6.5 > tar)
- **Attack vector:** Crafted tar archive with PAX size overrides on GNU long-name headers causes parser differential
- **Exploitability assessment:** VERY LOW — `@capacitor/cli` is a dev-only mobile build tool. The tar library is used for unpacking during `capacitor build`. An attacker would need to supply a malicious tar archive consumed by the build pipeline — requires developer machine compromise or supply chain attack on @capacitor.
- **Fix:** Added pnpm override `tar: >=7.5.16`. Patch-level update, no breaking changes.

### 4. js-yaml — Quadratic DoS via merge key aliases (GHSA-h67p-54hq-rp68) — MODERATE — OPEN

- **Vulnerable:** <=4.1.1 | **Fix:** >=4.2.0
- **Installed:** 3.14.2 (27 paths, all through @changesets/cli chain)
- **Full chain:** @changesets/cli@2.31.0 > @changesets/apply-release-plan@7.1.1 > @changesets/config@3.1.4 > @manypkg/get-packages@1.1.3 > read-yaml-file@1.1.0 > js-yaml@3.14.2
- **Attack vector:** Crafted YAML with repeated merge key aliases triggers O(n²) parsing
- **Exploitability assessment:** NEGLIGIBLE — This is exclusively a dev dependency used by `@changesets/cli` for release management. It only parses YAML files from the trusted repository (`.changeset/*.md` config files). No user-controlled input is ever processed. Requires developer to commit malicious YAML to the repo AND run `changeset version` or `changeset publish`.
- **Why not overridden:** `read-yaml-file@1.1.0` calls `yaml.safeLoad()` which was **removed** in js-yaml 4.x (replaced by `yaml.load()` with different defaults). Overriding js-yaml to >=4.2.0 would break `@changesets/cli` entirely (confirmed — `TypeError: Cannot read properties of undefined`). Overriding `@manypkg/get-packages` to v2+ also breaks changesets (API shape changed between v1 and v2, confirmed — `.dir` property missing).
- **Recommended action:** Accept as documented risk OR adjust CI audit threshold. This vulnerability cannot be fixed via overrides without upstream @changesets changes.

---

## Changes Applied

### package.json — pnpm overrides

```diff
 "pnpm": {
   "overrides": {
     "esbuild": ">=0.28.1",
     "postcss": ">=8.5.10",
     "vite": ">=6.4.2",
-    "ws": ">=8.20.1",
-    "uuid": ">=11.1.1"
+    "ws": ">=8.21.0",
+    "uuid": ">=11.1.1",
+    "form-data": ">=4.0.6",
+    "tar": ">=7.5.16"
   }
 }
```

### Audit result after fix

```
$ pnpm audit --audit-level moderate
1 vulnerabilities found
Severity: 1 moderate

Only js-yaml@3.14.2 remains (dev-only, @changesets/cli chain)
```

---

## Recommendations

### For PR #93 merge

**Option A (Recommended):** Apply the overrides above + adjust CI audit to allow the js-yaml moderate:

```yaml
# In .github/workflows/ci.yml, change:
#   pnpm audit --audit-level moderate
# to either:
#   pnpm audit --audit-level high        # only block on HIGH+
# or add an ignore list for the js-yaml dev-only vuln
```

**Option B:** Apply the overrides + file an upstream issue on @changesets/cli to update `@manypkg/get-packages` to v2+ or update `read-yaml-file` to v3+ (which uses js-yaml@^4.1.1).

**Option C:** Apply the overrides as-is. The remaining 1 moderate will still fail CI. Manually merge with admin override while waiting for upstream fix.

### Long-term

- Monitor @changesets/cli releases for `@manypkg/get-packages` upgrade
- Consider adding `socket.io` to a regular update cadence (currently at latest 4.8.3)
- The ESLint 9→10 upgrade in PR #93 is NOT the source of any vulnerability — all 4 are pre-existing on main

---

## Verdict

**PASS with conditions.** The 2 HIGH vulnerabilities (ws, form-data) are fixed via pnpm overrides. The 2 MODERATE vulnerabilities (tar fixed, js-yaml accepted) are dev-only with negligible exploitability. The PR #93 ESLint upgrade is clean — these are all pre-existing transitive dependency issues.
