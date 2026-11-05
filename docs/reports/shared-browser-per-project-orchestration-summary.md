# Orchestration summary — shared-browser-per-project (run 2)

Date: 2026-09-30 · Orchestration log: `docs/reports/shared-browser-per-project-orchestration-log.md`

## 1. Status

**COMPLETED.** The review gate was met in cycle 1 of 5: all 12 scored parameters are ≥ 4 and the verdict is "Approve with nits".
Execution mode: each stage ran as a **separate sub-agent with a fresh context** (task-analysis, planner,
implementation, review and code-quality agents). The orchestrator only coordinated. It edited no framework code and no
other agent's artifact.

## 2. Initial requirement from the SDET (verbatim)

> Make changes in code to use 1 browser session in a project across multiple workers but each testcase in the workers in the same project should use different contexts.
>
> Create a separate shared browser session using a dependencies function for each existing project like setup_chromium for chromium, setup_firefox for firefox, etc. Create a new browser context from the respective shared browser session in the testcases. Remove the global setup function

## 3. Requirements from the task analysis agent

Path: `docs/requirements/shared-browser-per-project-requirements.md` (Revision 1; updates the 2026-09-29 draft from run 1).

**Objective:** each UI project (chromium, firefox, webkit) has one shared browser session. It comes from that project's
own `setup_<project>` dependency project, and every worker of the project uses it. Every test creates a fresh
context from that browser. The global setup is removed, and existing tests behave the same as before.

Acceptance criteria:
- **AC-1** — One browser instance per project across ≥ 2 workers, and it is the one from `setup_<project>`.
- **AC-2** — Each engine has a distinct instance, supplied by its own setup project.
- **AC-3** — Each test gets a new context and page from the shared browser, and the context is closed at the end of the test.
- **AC-4** — No state leaks between tests (cookies, localStorage, sessionStorage, permissions, routes).
- **AC-5** — Verification tests on all three engines, locally and in CI mode, with no external site.
- **AC-6** — The cross-worker check runs when there are ≥ 2 workers and skips with a stated reason at 1 worker.
- **AC-7** — No orphaned browsers after a complete, failed or interrupted run. Shutdown is per project.
- **AC-8** — Existing tests are unchanged and have the same outcomes.
- **AC-9** — `api` has no setup dependency, and `--project=api` launches no browser.
- **AC-10** — Headed locally, headless on CI.
- **AC-11** — Per-project emulation and `baseURL` still apply per context.
- **AC-12** — Trace, video and screenshot are still captured on failure, and a retry gets a fresh context.
- **AC-13** — `--project`, `--grep` and `--shard` subsets start at most one browser per UI project in the run.
- **AC-14** — Setup launch failures and mid-run crashes fail fast with an attributable error.
- **AC-15** — Jenkins is green apart from the known gap, with no new secrets.
- **AC-16** — The README documents the execution model.
- **AC-17** — tsc, ESLint and Prettier are clean.
- **AC-18** — `setup_chromium`, `setup_firefox` and `setup_webkit` are one-to-one dependencies of their projects.
- **AC-19** — No `globalSetup`/`globalTeardown`, and no leftovers of the old mechanism.
- **AC-20** — Setup and teardown tests are tagged.

**Scope exclusions:**
- The `api` project.
- Sharing across engines, shards or builds.
- Sharing contexts or state between tests.
- Performance targets.
- Fixing the known environment gaps.

**Assumptions (non-blocking):**
- A-1: "Shared" means one detached browser server per project that outlives the setup worker.
- A-2: All three engines are in scope.
- A-3: Always on, no toggle.
- A-4: The SDET's CI worker count stands.
- A-5: `--ui`/`--debug` must keep working.
- A-6: Tags are `@regression` + `@framework`.
- A-7: Loopback only.
- A-8: `--grep` behaviour is recorded as observed.
- A-9: Underscore names, as the SDET wrote them.
- A-10: Removing the global setup also removes any global teardown.

Re-analysis cycles: none were needed.

## 4. Cycle history

| Cycle | Overall | Lowest parameter(s) | Verdict | Key fixes |
|---|---|---|---|---|
| 1 | 4 | 4: Correctness, Requirement coverage, Readability (d), Robustness (g), Reporting (h), Security (i), CI/CD (j) | Approve with nits | n/a (first pass) |

## 5. Changes made (uncommitted working tree)

**What happened to run 1's uncommitted globalSetup/broker work (plan §6.0):**

| Outcome | Files | Reason |
|---|---|---|
| Deleted | `fixtures/shared-browser/broker.ts`, `fixtures/shared-browser/global-setup.ts`, `tests/ui/framework/shared-browser-broker.spec.ts` | They existed only for the removed global-setup mechanism (AC-19). |
| Kept unchanged | `utils/browser-state.ts`, `data/builders/state-marker.builder.ts` | Still valid for the isolation tests. |
| Adapted | `fixtures/index.ts`, `config/env.ts`, `fixtures/shared-browser/client.ts`, `fixtures/shared-browser/types.ts`, `tests/ui/framework/shared-browser.spec.ts`, `data/framework/shared-browser.data.ts`, `README.md`, `playwright.config.ts` | Moved from the broker to the setup-project model. |
| Reverted to HEAD | `.env.example` | The broker env var no longer exists. |

**Added:**
- `fixtures/shared-browser/browser-server.mjs`: a detached, loopback-only `launchServer` process. It writes an atomic state file and runs a runner-pid watchdog.
- `fixtures/shared-browser/state.ts`: run and state-file paths under `os.tmpdir()`, the attachment registry and stale-run cleanup.
- `fixtures/shared-browser/lifecycle.ts`: starts the server (event-driven wait with a bound) and stops it (SIGTERM, then kill the process group).
- `fixtures/shared-browser/projects.ts`: `sharedBrowserProjects()` builds `setup_<n>` → `<n>`, with `teardown_<n>` linked through the setup project's `teardown` property.
- `fixtures/shared-browser/errors.ts`: `SharedBrowserError`.
- `tests/setup/shared-browser.setup.ts` and `tests/setup/shared-browser.teardown.ts`: SU-1..3 and TD-1..3.
- `tests/ui/framework/shared-browser-errors.spec.ts`: launch failure, crash and missing state.

**Modified:**
- `playwright.config.ts`: `globalSetup` removed, and the UI projects are built through `sharedBrowserProjects`. `api` is unchanged.
- `fixtures/index.ts`: a worker `sharedBrowser` fixture, a `connectOptions` override (the built-in `browser`/`context`/`page` do the rest) and crash attribution in `context`.
- `config/env.ts`: only `isPlaywrightDebugMode()` is kept.
- `tsconfig.json`: `allowJs`/`checkJs` so the `.mjs` file is type-checked.
- `README.md`: the execution model section is rewritten.

**Unchanged:** `Jenkinsfile`. Existing specs were not edited.

**Tests and tags added:**
- `@setup-shared-browser-{chromium,firefox,webkit}` and `@teardown-shared-browser-{…}`, with `@framework`.
- The following tests run on all three UI projects, each tagged `@regression @framework` plus its own tag:
  - `@shared-browser-across-workers-probe-a` / `-b`
  - `@isolated-context-first-test-writes-state`
  - `@isolated-context-next-test-starts-clean`
  - `@shared-browser-launch-failure-reported`
  - `@shared-browser-crash-reported`
  - `@shared-browser-missing-state-reported`
  - `@shared-browser-project-wiring`

`--list` shows 47 tests in 8 files, with 22 unique scenario tags and no duplicates.

**Test runs:** every run used the sandbox override. Figures come from the implementation summary and were independently re-run by the reviewer.

| Run | Result |
|---|---|
| `--grep @framework --workers=2`, headed, 3 engines | **30 passed**. The probes ran and did not skip. One server per engine, with 2 workers attached to each. |
| `CI=1` full suite (headless, 2 CI workers from the config) | **45 passed, 2 failed**. The 2 failures are `@api-fetch-user-by-id` / `@api-create-user`, the **known `/auth/login` environment gap, not a defect**. All 15 existing UI tests passed. |
| Full UI suite, headed, 3 projects | 45 passed (implementer) |
| `--workers=1` | Probes skipped with the documented reason. The rest passed. |
| `--project=api` / `--grep @api` | No setup project ran and no browser started. Only the known gap failed. |
| `--project=chromium` | 15 passed. Only `setup_chromium`/`teardown_chromium` ran. |
| `--shard=1/3`, `2/3`, `3/3` | 18 / 18 / 13 passed. Each shard started only its own engines. The 2 shard-3 failures are the api gap. |
| Real mid-run crash (throwaway spec), 3 engines | Attributable `[shared-browser] … is crashed` error. The next test failed in 0 ms with no hang. |
| Setup launch failure (temporary firefox edit, restored) | `setup_firefox` failed with its cause. Firefox tests did not run. The other engines passed. |
| Ctrl+C / SIGTERM / SIGKILL / `--global-timeout` | Teardown projects didn't run, as expected. The watchdog left **0** servers and browsers within 2–4 s, and the next run cleaned up stale state. |
| Final orphan census | 0 `browser-server.mjs`, 0 `ms-playwright`, and the state dir is empty. |

## 6. Final review scorecard and code quality

Review (`docs/reports/shared-browser-per-project-review-cycle-1.md`):

| Parameter | Score |
|---|---|
| Correctness | 4 |
| Requirement coverage | 4 |
| Architecture & reusability (a, b) | 5 |
| Configurability (c) | 5 |
| Readability & style (d) | 4 |
| Maintainability & locators (e) | 5 |
| Scalability & tagging (f) | 5 |
| Robustness & reliability (g) | 4 |
| Reporting & traceability (h) | 4 |
| Security & data hygiene (i) | 4 |
| CI/CD readiness (j) | 4 |
| Repo-rule compliance | 5 |
| **Overall** | **4 — Approve with nits** |

There are no blocker or major findings.

Minor findings:
- **F-1:** an unreachable stop-during-launch guard in `browser-server.mjs:135-137`, with a misleading comment. There is no orphan risk.
- **F-5:** the Linux/Docker Jenkins path hasn't been verified.

Nits:
- **F-2:** a worker's attachment is recorded before it connects.
- **F-3:** a test title says "failed setup".
- **F-4:** the ws endpoint could appear in a failing assertion's message.

Code quality (`docs/reports/code-quality-2026-09-30.md`): the **fallback gate passes**. Sonar was skipped because no server or token is configured, which is the known gap. `tsc` 0 errors, ESLint 0 errors / 0 warnings across 39 files, Prettier 0 non-compliant files repo-wide. Maximum cyclomatic complexity is 10. There are 3 Minor and 8 Info findings.

Top recommendations:
- **CQ-2:** guard `process.kill` against `ESRCH` in teardown (`lifecycle.ts:253`).
- **CQ-4 / CQ-6:** remove about 40 duplicated lines of wait and list-directory code.
- **CQ-8 = F-1**.
- **CQ-1:** ESLint has no rules for `*.mjs`.
- **CQ-3:** confirm the CI retries and workers values.
- `utils/logger.ts` reads `process.env` directly. This predates this run.

## 7. Learnings added (`.ai/context/automation-pipeline-learnings.md`)

1. A browser launched inside a setup-project test dies with the setup worker, so sharing needs a detached server process plus a teardown project.
2. Teardown projects don't run on interrupt, so detached helpers need a runner-pid watchdog. On macOS, WebKit's server process is a `bash` wrapper, so kill the process group.
3. The CLI `--grep`/`--grep-invert` doesn't filter dependency projects; use a project-level `grep`.
4. `eslint.config.mjs` has no rules for `.mjs`. Rely on `checkJs` and avoid top-level `await`. The repo-wide Prettier backlog is now cleared.
5. Orchestrators should snapshot SDET-owned config lines at the start of a run and surface any drift.

## 8. Open items for the SDET

- **Confirm the CI `workers`/`retries` values.** At the start of the run `playwright.config.ts` had `workers: CI ? 5`, `retries: CI ? 2`. By stage C it read `workers: CI ? 2`, `retries: CI ? 1`, and no pipeline agent made that edit. The pipeline left it as found. With 2 workers the cross-worker probes still run on CI. The comment "Opt out of parallel tests on CI." above that line is now stale.
- **First Jenkins/Linux Docker build:** check the `[shared-browser]` log lines and that the process list is clean (F-5). If zombies appear, consider adding `args '--init'`.
- `--ui`, IDE and `--debug` modes haven't been verified by a human. Under `PWDEBUG`, each worker falls back to its own browser.
- Optional follow-up cleanup: F-1/CQ-8, CQ-2, CQ-4/6, F-3 title wording, CQ-1 `.mjs` ESLint block.
- Known environment gaps are unchanged: `API_BASE_URL` has no `/auth/login`, and there is no Sonar server.
- Windows isn't supported by the process-group kill logic.
- **Nothing was committed or pushed.**

## 9. Artifacts

- Requirements: `docs/requirements/shared-browser-per-project-requirements.md`
- Plan: `docs/plans/shared-browser-per-project-plan.md` (prototype evidence in §3; exploration rationale in §1. Codegen wasn't needed because no page flow is involved, so there is no `docs/exploration/` file)
- Implementation summary: `docs/reports/shared-browser-per-project-implementation-summary.md`
- Review: `docs/reports/shared-browser-per-project-review-cycle-1.md`
- Code quality: `docs/reports/code-quality-2026-09-30.md`
- Orchestration log: `docs/reports/shared-browser-per-project-orchestration-log.md`
- Learnings: `.ai/context/automation-pipeline-learnings.md`
