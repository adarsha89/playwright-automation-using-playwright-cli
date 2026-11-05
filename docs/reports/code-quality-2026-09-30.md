# Code quality report: 2026-09-30

Stage E (`check-code-quality`, `code-quality-agent`) of the `shared-browser-per-project` orchestration run.
Input: `docs/reports/shared-browser-per-project-implementation-summary.md`. No source code was changed and nothing was committed.

## 1. Setup status, tool versions, scope

| Item | Status |
|---|---|
| Sonar | **Skipped (expected).** No `sonar-project.properties`, no `sonarqube-scanner` in `package.json`, no Sonar stage in `Jenkinsfile`, and `SONAR_TOKEN` / `SONAR_HOST_URL` are not set. This is the known environment gap in `.ai/context/automation-pipeline-learnings.md`, not a pipeline defect. Per the caller's instruction, no Sonar config was added and no token was requested. `.gitignore` already covers `.scannerwork/` and `/reports/`. |
| Fallback gate used | `tsc --noEmit` + ESLint (JSON report) + `prettier --check .` + repo-convention greps + manual metrics (TypeScript-AST function size / approximate cyclomatic complexity, manual duplication review) |
| Tool versions (installed) | TypeScript 6.0.3, ESLint 10.8.1 (flat config), Prettier 3.9.6, Playwright 1.62.1, Node v26.10.0 |
| Scope: in focus | Files changed in this run: `playwright.config.ts`, `fixtures/index.ts`, `fixtures/shared-browser/{browser-server.mjs,client.ts,errors.ts,lifecycle.ts,projects.ts,state.ts,types.ts}`, `tests/setup/shared-browser.{setup,teardown}.ts`, `tests/ui/framework/shared-browser{,-errors}.spec.ts`, `config/env.ts`, `tsconfig.json`, `utils/browser-state.ts`, `data/framework/shared-browser.data.ts`, `data/builders/state-marker.builder.ts`, `README.md` |
| Scope: context | Whole repo for tsc/ESLint/Prettier/greps (ESLint linted 39 files) |
| Size of this change | 1,576 LOC in 14 new files, plus 151 insertions / 21 deletions in 5 tracked files (`README.md`, `config/env.ts`, `fixtures/index.ts`, `playwright.config.ts`, `tsconfig.json`) |

## 2. Quality gate status and ratings

- Sonar quality gate and A-E ratings: **N/A (Sonar skipped)**.
- Fallback gate: **PASS**. tsc, ESLint and Prettier are all clean, and no repo-convention violations were introduced by this run. The findings below are Low/Info maintainability and robustness items. None of them blocks.

## 3. Metrics

| Metric | Value |
|---|---|
| Bugs / vulnerabilities / security hotspots / code smells (Sonar) | N/A (Sonar skipped) |
| Duplication % (Sonar) | N/A. Manual review: 6 small duplicated blocks, all under 25 lines (see §4, CQ-4 to CQ-7) |
| LOC in scope (new files) | 1,576 |
| `npx tsc --noEmit` | **0 errors** (exit 0; `browser-server.mjs` is included via `checkJs`) |
| `npx eslint . -f json -o reports/eslint-report.json` | **0 errors, 0 warnings** across 39 files (exit 0) |
| `npx prettier --check .` | **0 non-compliant files** ("All matched files use Prettier code style!"). The 41-file backlog noted in the learnings file is now cleared. |
| Functions analysed (changed code files) | 141 |
| Max approximate cyclomatic complexity | 10: `startSharedBrowserServer` (`fixtures/shared-browser/lifecycle.ts:152`). 0 functions above 10 |
| Functions > 50 lines | 6: `startSharedBrowserServer` 81 (lifecycle.ts:152), `browser-server.mjs` `main` 58 (l.111), probe test body 62 (shared-browser.spec.ts:43). The other 3 are `test.describe` callbacks (76, 72, 54 lines) that only wrap several tests. |
| Other complexity hotspots | `fixtures/index.ts` `context` override CC 7; `client.ts` `readReadySharedBrowser` CC 6 (a linear guard chain); `state.ts` `listAttachedWorkers` CC 6 |
| `eslint-disable` in scope | 2, both `playwright/no-skipped-test` for justified runtime skips (shared-browser.spec.ts:44, :74). No `@ts-ignore`, no `any` |

## 4. Top issues by severity

No Blocker, Critical or Major issues. All findings are in code introduced by this run unless marked otherwise.

| # | Severity | Rule / category | file:line | Message |
|---|---|---|---|---|
| CQ-1 | Minor | Tooling coverage | `eslint.config.mjs:32-49` (pre-existing) | ESLint rules apply only to `**/*.ts` and `tests/**/*.ts`. `fixtures/shared-browser/browser-server.mjs` is linted with **no rules** (it shows in the report with 0 messages because nothing is configured for `.mjs`). It is type-checked (`// @ts-check` + `checkJs`), but it gets no lint rules (e.g. `no-unused-vars`, `no-floating-promises`-style checks). This file is now runtime code, so the gap matters. |
| CQ-2 | Minor | Robustness (unguarded race) | `fixtures/shared-browser/lifecycle.ts:253` | `process.kill(serverPid, 'SIGTERM')` is not wrapped. If the server exits between `isProcessAlive()` (l.250) and the kill, `ESRCH` is thrown. The `finally` still removes the files, but the teardown test fails with a raw errno error instead of reporting `not-running`. `signalGroup()` in the same file already swallows this case. |
| CQ-3 | Minor | Convention drift / stale comment | `playwright.config.ts:14,16` | `retries: process.env.CI ? 1 : 0` no longer matches principle g in `framework-design-principles.md` (`retries: process.env.CI ? 2 : 0`). The comment "Opt out of parallel tests on CI." sits above `workers: process.env.CI ? 2 : undefined`, which does the opposite. Both are SDET edits the implementer deliberately left alone (implementation summary D-1). The SDET needs to decide, and then update either the config or the principles table. |
| CQ-4 | Minor | Duplication (logic) | `lifecycle.ts:110-144` vs `client.ts:103-137` | `waitForRunDir` and `waitForSharedBrowserVerdict` repeat the same ~25-line "settled flag + timer + `fs.watch(runDir())` + extra trigger + initial check" pattern. `waitForSharedBrowserVerdict` could be written on top of a shared `waitForRunDir` (moved to `state.ts`), with the `disconnected` event as its extra trigger. |
| CQ-5 | Info | Duplication (intentional, documented) | `browser-server.mjs:50-54` vs `state.ts:104-111`; `browser-server.mjs:102-109` vs `state.ts:173-184` | The atomic state write and the pid liveness check exist twice. This is because the `.mjs` runs outside the TS transpiler, and `types.ts:57-58` documents the parity requirement. The `.mjs` liveness check lacks the `pid <= 0` guard, but `runnerPid` is validated as positive by Zod before spawn, so this is safe today. Keep the pairs in sync, or add a unit test that pins their behaviour. |
| CQ-6 | Info | Duplication (small) | `state.ts:136-144, 157-165, 194-202` | The "`readdirSync`, return `[]` on `ENOENT`, otherwise rethrow" block appears 3 times. A `readdirOrEmpty(dir)` helper would remove about 20 lines. |
| CQ-7 | Info | Duplication / magic number | `tests/setup/shared-browser.setup.ts:28`, `tests/ui/framework/shared-browser-errors.spec.ts:41`; `tests/ui/framework/shared-browser.spec.ts:93-98, 130-135` | `SHARED_BROWSER_START_TIMEOUT_MS + 15_000` is repeated (it could be an exported `SHARED_BROWSER_SETUP_TEST_TIMEOUT_MS`). The expected "marker state" snapshot literal appears twice in the spec (it could be a `markerSnapshot(marker)` helper next to `CLEAN_STATE`). |
| CQ-8 | Info | Dead branch / misleading comment | `fixtures/shared-browser/browser-server.mjs:135-138` | `if (shuttingDown) return; // shutdown() is already closing it` cannot be reached. With `server` still undefined, `shutdown()` has no `await` before `process.exit(0)`, so the process exits synchronously and never resumes `main()`. There is no orphan risk: Playwright's own `exit` handler (`playwright-core/lib/coreBundle.js` `exitHandler` → `killSet`) kills an already-spawned browser. The comment should say that instead. |
| CQ-9 | Info | Performance (bounded) | `fixtures/index.ts:21, 112-128` | `BROWSER_CLOSED_ERROR` also matches `Target page, context or browser has been closed`, which a test can trigger itself (e.g. by closing its own page). In that case the verdict stays `ready`, and the fixture waits the full `SHARED_BROWSER_VERDICT_TIMEOUT_MS` (5 s) before it gives up. Attribution stays correct (no false blame, as V-14 confirmed), but each such failure costs about 5 s. That's acceptable, and worth documenting. |
| CQ-10 | Info | Size hotspot | `fixtures/shared-browser/lifecycle.ts:152-232` | `startSharedBrowserServer` is 81 lines at CC 10, the largest function in the change. Its readability is fine. If it grows, extract `spawnServer()` (l.175-189) and `throwForOutcome()` (l.210-230). |
| CQ-11 | Info | Test-only error type | `tests/ui/framework/shared-browser.spec.ts:31` | `requireSharedBrowser` throws a plain `Error`, so under `--debug` this failure lacks the `[shared-browser]` prefix. Cosmetic. |

## 5. Repo-convention checks

| Check | Result |
|---|---|
| `waitForTimeout` anywhere in `pages/ fixtures/ tests/ utils/ data/ api/ config/` | **0 hits** |
| `test.only` / `describe.only` | **0 hits** |
| `process.env` outside `config/env.ts` / `playwright.config.ts` | 1 hit: `utils/logger.ts:19` (`process.env.DEBUG`). **Pre-existing** (commit `8ffd520`), not from this run. The new `PWDEBUG` read goes through `config/env.ts` `isPlaywrightDebugMode()`, which is correct. |
| Locators (`page.locator` / `getBy*`) inside `tests/` | **0 hits** |
| Hard sleeps | 0. The 4 `setTimeout`s in `fixtures/shared-browser/*` are bounded timeout guards racing an event (`fs.watch` / `exit` / `disconnected` / `close`), not sleeps. The 2 `test.setTimeout` / `setup.setTimeout` calls are test time budgets |
| `test(` without a `tag` option | 0 in suite files (47 listed tests, all tagged). The only untagged `test(` is `tests/seed.spec.ts`, which is outside every project's `testMatch` and ESLint-ignored by design |
| Unique scenario tag per test | All 47 tests have a unique scenario tag. 22 distinct unique tags, **0 duplicated unique tags**. `@network-validation` appears on 2 SauceDemo tests, but it is a shared classification tag, and each of those tests also has its own unique tag (`@cart-add-product`, `@login-valid-credentials`). |
| Tag style (`tag` option, not inline title text) | Compliant in all new specs, including the generated setup/teardown/probe tags (`setupTag()` / `teardownTag()` / `SHARED_BROWSER_PROBES[].tag`) |
| Hard-coded credentials / URLs | None in scope. `STATE_PROBE_ORIGIN = 'https://shared-browser.invalid/'` (RFC 2606 reserved, route-stubbed) lives in `data/`, as it should. `wsEndpoint` is never logged (checked `browser-server.mjs` `log()` calls and the `formatSharedBrowser*` helpers). State dir `0o700`, files `0o600`, outside the repo |
| Base-URL concatenation (learning #7) | Not applicable to the new code. `utils/browser-state.ts` uses `joinUrl()` |
| ESLint flat config only | Yes (`eslint.config.mjs`) |
| Version pinning (learning #2) | No new version pins. `Jenkinsfile` is unchanged |

## 6. Trend

This is the **first** `docs/reports/code-quality-*.md` in the repo, so there's no earlier report to compare against. Earlier signals come from other artifacts:
- Prettier: 41 non-compliant files repo-wide (learnings file, SauceDemo network-interception review) → **0** now.
- tsc / ESLint: clean before this run (implementation summary §0) → still clean after adding 1,576 LOC.
- Tests listed: 17 at HEAD → 47 now (no failures introduced; the 2 API failures are the known `/auth/login` environment gap).

Use this report as the baseline for future runs.

## 7. Prioritised recommendations

**Introduced by this run (can go to `make-code-changes` as one small follow-up plan; none blocks the merge):**
1. **CQ-2**: guard the teardown `SIGTERM` in `stopSharedBrowserServer` against `ESRCH`, e.g. reuse a non-throwing single-pid variant of `signalGroup`, and treat that case as `not-running`.
2. **CQ-4 / CQ-6**: extract the shared event-driven waiter and a `readdirOrEmpty` helper into `state.ts`. That removes about 40 duplicated lines from `lifecycle.ts` / `client.ts` / `state.ts`.
3. **CQ-8**: fix the misleading comment at `browser-server.mjs:135-137`, or drop the unreachable branch.
4. **CQ-7 / CQ-11**: name the setup timeout budget constant, add a `markerSnapshot()` helper, and use `SharedBrowserError` in `requireSharedBrowser`.
5. **CQ-9**: optionally narrow `BROWSER_CLOSED_ERROR`, or document the ≤ 5 s cost on self-closed-page failures.

**Pre-existing debt or SDET decisions (not caused by this run):**
6. **CQ-1**: add an `eslint.config.mjs` block for `**/*.mjs` (at least `@eslint/js` recommended, with Node globals), so `browser-server.mjs` and `.ai/skills/**/scripts/*.mjs` actually get linted.
7. **CQ-3**: SDET to confirm CI `retries` (1 vs the documented 2) and `workers` (2 vs the plan's 5), then fix the stale "Opt out of parallel tests on CI." comment and bring `framework-design-principles.md` in line.
8. `utils/logger.ts:19` reads `process.env.DEBUG` directly. Move it behind `config/env.ts` (principle c).
9. **Sonar**: when an SDET can supply a SonarCloud org/SonarQube URL and export `SONAR_TOKEN` in the shell/Jenkins credential store, re-run this skill to add `sonar-project.properties`, the `sonarqube-scanner` script, `lint:report`, and a Jenkins stage. Until then the fallback gate above is the quality signal.
10. Carry-over verification gaps from the implementation summary (not code-quality defects): Linux/Docker Jenkins run not yet verified (consider `args '--init'`), and `--ui`/`--debug` not exercised.

Next: if the caller wants the fixes, run `automation-planner-agent` / `code-implementation-agent` with items 1-5 (and 6, 8 if pre-existing debt is in scope). Otherwise the pipeline can proceed to learnings/summary.
