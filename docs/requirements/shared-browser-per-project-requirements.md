# Shared Browser per Project (isolated context per test) — Automation Requirements

Source: SDET requirement (verbatim):

> Make changes in code to use 1 browser session in a project across multiple workers but each testcase in the workers in the same project should use different contexts.
>
> Create a separate shared browser session using a dependencies function for each existing project like setup_chromium for chromium, setup_firefox for firefox, etc. Create a new browser context from the respective shared browser session in the testcases. Remove the global setup function

Orchestration: `docs/reports/shared-browser-per-project-orchestration-log.md` (earlier run logged in `docs/reports/orchestration-2026-09-29-2141-orchestration-log.md`), cycle 1 · Date: 2026-09-30 · Status: Revision 1 (SDET requirement change: second paragraph added; supersedes the 2026-09-29 draft)

> **Change note (Revision 1).** The 2026-09-29 draft covered only the first paragraph and left the
> mechanism open. The previous implementation, which is still uncommitted in the working tree,
> started the shared browsers from a run-wide global setup. The SDET's second paragraph now fixes three
> requirement-level constraints:
> (1) each UI project gets its **own setup project, named `setup_<project>`, declared as a dependency of
> that project**, which provides the project's shared browser session;
> (2) **each testcase creates its new browser context from its own project's shared browser session**;
> (3) **the global setup function is removed** (no run-wide global setup or teardown remains).
> Sections 1–12 were revised to match. Criteria that are still valid were kept, and changed or new criteria are marked
> *(rev 1)*. The SDET's uncommitted `workers: process.env.CI ? 5 : undefined` edit is treated as the intended
> CI worker count, so cross-worker sharing is now demonstrable on CI as well (Q-4, AC-6, R-3 updated).

## 1. Objective

Today every Playwright worker process launches its own browser, so a UI project running with N
workers starts N browsers. The SDET wants **one browser session per UI project, provided by a
dedicated per-project setup project (`setup_chromium`, `setup_firefox`, `setup_webkit`) that the project
depends on**. All workers of that project share this session. Every individual testcase must still create its
**own fresh browser context** (and page) from that shared session, so tests stay isolated. The existing
run-wide global setup is removed. This is a framework and infrastructure change, not a new application flow.
Success means both the sharing and the isolation can be shown with evidence, the new wiring can be seen in the
project configuration, and every existing spec behaves as it does now.

## 2. Scope

**In scope**
- The three UI browser projects: `chromium`, `firefox`, `webkit`. Each one gets exactly one shared browser
  session per test run (per shard, see §3), used by every worker in that project.
- *(rev 1)* Three new setup projects, **`setup_chromium`, `setup_firefox`, `setup_webkit`**, each declared as a
  dependency of the matching UI project. Each one provides that project's shared browser session. The shared
  session is then shut down after that project's tests finish. The shutdown step may be part of the setup project's
  lifecycle or a paired teardown project, which is the planner's choice, but it must be tied to the project and not
  to a global hook.
- *(rev 1)* Removing the global setup function. The Playwright configuration no longer declares a run-wide
  global setup or global teardown, and no code, tests or docs for the previous global-setup/runner-process
  mechanism are left behind.
- Per-test isolation. Each testcase creates a brand-new browser context **from its own project's shared browser
  session**. Contexts are never reused across tests, whether the tests run in the same worker or in different
  workers.
- Lifecycle of the shared browser: it starts before the project's first test needs it and is shut down after the
  project's tests finish, including when they fail, are interrupted or time out.
- Keeping current behaviour: headed locally and headless on CI, per-project device emulation (Desktop
  Chrome/Firefox/Safari profiles), `baseURL`, trace/video/screenshot on failure, retries, reporters, tags.
- Running a subset of projects (e.g. `--project=chromium`, `--project=api`, `--grep`, `--shard`) keeps working
  and only starts browsers for UI projects that actually run.
- Verification tests that prove the sharing, the isolation and the wiring (Scenarios S-4 to S-6 and S-11).
- Updating the user-facing docs (README "Running tests" / "Execution model" or equivalent) to describe the new
  execution model, the setup projects and any new setting.
- CI (Jenkins) compatibility: the existing pipeline keeps working with no new secrets or credentials.

**Out of scope / exclusions**
- The `api` project. It launches no browser today, must not start launching one, and must **not** depend on any
  `setup_*` project (AC-9).
- Sharing a browser *across* projects (e.g. chromium and webkit sharing one) or across separate shards or
  CI builds. Each is impossible or meaningless, because they are different engines or different machines.
- Sharing browser contexts, pages, cookies or storage between tests. This is explicitly forbidden.
- Changing the worker count. The SDET's edit (CI = 5 workers, local = Playwright default) is taken as given
  and must not be changed by this work (Q-4).
- Performance targets or benchmarking. No speed or memory requirement was stated.
- Playwright UI mode (`--ui`), `--debug` and VS Code extension flows beyond "must not be made unusable" (Q-5).
- Fixing the known environment gaps listed in §10.
- New application or page coverage. No page flow is being automated.

**Existing coverage (must keep passing, with titles, tags and test steps unchanged)**:
`@homepage-heading-and-get-started-link`, `@login-valid-credentials`, the parameterised SauceDemo
invalid-login cases (`@regression` + per-case tag), and `@cart-add-product` on chromium/firefox/webkit. The `api`
project tests `@api-fetch-user-by-id` and `@api-create-user` are subject to the known environment gap in §10.

**Prior uncommitted work**: the previous cycle's verification tests (tags such as
`@isolated-context-first-test-writes-state`, `@isolated-context-next-test-starts-clean`,
`@shared-browser-crash-reported`, `@shared-browser-launch-failure-reported` and the per-probe sharing tags) were
written for the global-setup mechanism. The planner decides whether to keep, adapt or replace them, but the
result must meet the ACs below against the **new** mechanism. Any test that only exercises the removed
mechanism must be removed (AC-19).

## 3. Target & environment

- Installed runner: `@playwright/test` 1.62.1. The Jenkins Docker image is pinned to the matching `v1.62.1-noble`.
- Projects affected: `chromium`, `firefox`, `webkit` (UI specs), plus the new `setup_chromium`, `setup_firefox`,
  `setup_webkit`. The `api` project is not affected.
- Environments: local developer machine (macOS, headed, Playwright default worker count) and Jenkins CI (Linux
  Docker, headless, **5 workers** per the SDET's edit, optional sharding via `SHARD_INDEX`/`SHARD_TOTAL`).
- Target sites used by existing specs: `BASE_URL` (playwright.dev example) and `SAUCEDEMO_BASE_URL`
  (saucedemo.com). The verification tests must not depend on any external site. They should work against locally
  rendered or blank content so they are deterministic (ASSUMPTION A-5).
- Technical constraint, stated as a requirement input rather than a design: in Playwright Test, each worker is a
  separate OS process, and setup projects run as tests inside a worker process. A browser launched inside a
  setup-project test would normally end when that worker exits. So "one browser session across multiple workers"
  must mean **one running browser instance (server) per project that outlives the setup test and that every worker
  of that project connects to** (ASSUMPTION A-1). How that is achieved is for the planner to decide.

## 4. Preconditions

- Playwright browsers for chromium, firefox and webkit are installed locally (`npx playwright install`). On CI they
  are provided by the Docker image.
- `.env` is populated per `.env.example`. No new secret may be required by this change.
- For verification of cross-worker sharing, the run must use **at least 2 workers** and enough tests that at least
  2 workers actually execute tests in the same project. This holds locally (default workers) and on CI (5 workers).

## 5. Scenarios

**S-1 One browser per UI project, shared across workers (happy path)**
Goal: a multi-worker run of a UI project uses exactly one browser instance for that project.
Steps: run the UI suite for one project with ≥ 2 workers. Record which browser instance each test's context
belongs to. Expected: every test in that project, whatever worker ran it, reports the same browser instance, and that
instance is the one provided by the project's `setup_<project>`. Exactly one browser process tree for that project
exists during the run.

**S-2 Separate browser per project**
Goal: chromium, firefox and webkit each get their own shared instance from their own setup project.
Steps: run all three UI projects together with ≥ 2 workers. Expected: tests within one project share one
instance, and the three projects each have a distinct instance of the matching engine (chromium tests run on
Chromium, firefox on Firefox, webkit on WebKit). `setup_chromium` feeds only `chromium`, and likewise for the other two.

**S-3 Fresh context per test (isolation)**
Goal: each testcase creates a distinct, clean browser context and page from its project's shared browser.
Steps: run several tests in the same project, some on the same worker and some on different workers.
Expected: every test reports a different context identity, and each context belongs to the project's shared
browser. State written by one test (cookies, localStorage, sessionStorage, permissions, routes, open pages) is
never visible to another test.

**S-4 Verification test: shared browser across workers**
A dedicated automated test (or small group of tests) that fails if two tests from the same project, run on
different workers, are not using the same browser instance. If the run genuinely has only one worker (e.g.
`--workers=1`), it is skipped with a clear reason instead of passing falsely (AC-6).

**S-5 Verification test: distinct context per test**
A dedicated automated test (or group) that fails if two tests in the same project share a context. This includes
two tests running consecutively in the same worker.

**S-6 Verification test: no state leakage**
A dedicated automated test pair or group. One test writes state (e.g. a cookie and a storage entry) and another test
in the same project confirms that state is absent. This must hold regardless of ordering and worker assignment.

**S-7 Lifecycle and teardown** *(rev 1)*
Goal: each project's shared browser is started by its setup project and is always shut down after that project's
tests.
Steps: (a) run to completion; (b) run with a failing test; (c) interrupt a run (Ctrl+C / CI abort) or have it time out.
Expected: in every case no browser process started by the run is left running afterwards, and the next run starts
cleanly. The shutdown is driven per project, not by a global hook.

**S-8 Subset runs** *(rev 1)*
Steps: run `--project=api` only; run `--project=chromium` only; run with `--grep` matching only API tests; run one
shard. Expected: an api-only run does not execute any `setup_*` project and starts no browser. A chromium-only run
executes `setup_chromium` only and starts only a Chromium shared browser. A sharded run starts at most one browser
per UI project that has tests in that shard. For the `--grep` case, see A-8.

**S-9 Existing behaviour preserved**
Steps: run the full existing suite locally (headed) and in CI mode (headless, `CI` set, 5 workers). Expected: the
same pass/fail outcome as before the change. Headed locally and headless on CI as today. Trace, video and
screenshot artifacts are still produced on failure and retry per the current config. Retries still work, and a retried
test gets a new context. The HTML and JUnit reports are still produced.

**S-10 Shared-browser failure (error path)** *(rev 1)*
Steps: (a) a project's setup project cannot start the shared browser; (b) the shared browser crashes or disconnects
mid-run. Expected for (a): the setup project is reported as failed with a clear cause, and that project's tests
do not run (they are reported as not run/skipped because of the failed dependency, per Playwright's dependency semantics). They
do not hang. Expected for (b): the affected tests fail promptly with a clear, attributable error naming the shared
browser as the cause, and do not hang until the global timeout. In both cases other projects are unaffected.

**S-11 Configuration wiring (structural check)** *(rev 1)*
Steps: list the configured projects (e.g. `npx playwright test --list`, or inspect the resolved configuration).
Expected: projects `setup_chromium`, `setup_firefox` and `setup_webkit` exist. `chromium` depends on
`setup_chromium`, `firefox` on `setup_firefox` and `webkit` on `setup_webkit`. `api` has no `setup_*` dependency.
No global setup or global teardown is configured.

## 6. Acceptance criteria

| AC | Criterion (pass/fail) | Scenario |
|---|---|---|
| AC-1 | Given a run of one UI project with ≥ 2 workers where ≥ 2 workers execute tests, then all tests in that project report the **same** browser-instance identity, it is the instance provided by that project's `setup_<project>`, and only one browser instance for that project is launched during the run. | S-1, S-4 |
| AC-2 | Given a run of chromium, firefox and webkit together, then each project uses exactly one shared browser instance of its own engine, provided by its own setup project, and the three instances are distinct from one another. | S-2 |
| AC-3 | Every testcase creates a **new** browser context (and page) **from its project's shared browser session**. No two tests (same or different worker) report the same context identity, and a context is closed when its test ends. | S-3, S-5 |
| AC-4 | State created in one test (cookies, localStorage, sessionStorage, granted permissions, network routes) is not observable in any other test of the same project, verified by an automated test. | S-3, S-6 |
| AC-5 | Automated verification tests for AC-1, AC-3 and AC-4 exist, run on all three UI projects, and pass locally (default workers) and in CI mode (5 workers). They need no external site. | S-4, S-5, S-6 |
| AC-6 *(rev 1)* | With the configured worker counts (local default ≥ 2 on a multi-core machine; CI 5) the cross-worker sharing check **executes and passes**. It is skipped, with an explicit reason and without passing vacuously or failing, only when the run really has a single worker (e.g. `--workers=1`). The per-test context-isolation checks (AC-3/AC-4) run and pass in every case. | S-4 |
| AC-7 *(rev 1)* | After a run that completes, fails, or is interrupted/timed out, no browser process launched by the run (by any `setup_*` project) remains alive. A subsequent run starts without manual clean-up. Shutdown happens after the owning project's tests finish, not via a global hook. | S-7 |
| AC-8 | All existing UI tests listed in §2 have the same outcome as before the change on chromium, firefox and webkit, both locally (headed) and in CI mode (headless). Their titles, tags and test steps are unchanged, and they get the shared-browser/new-context behaviour through the framework layer, not through per-spec edits. | S-9 |
| AC-9 *(rev 1)* | The `api` project behaves exactly as before. It has no dependency on any `setup_*` project, and a run limited to it executes no setup project and launches **no** browser. `@api-fetch-user-by-id` / `@api-create-user` results are unchanged, subject to the known environment gap in §10. | S-8, S-9, S-11 |
| AC-10 | Headed/headless behaviour is unchanged: headed when `CI` is unset, headless when `CI` is set. This applies to the shared browsers too. | S-9 |
| AC-11 | Per-project emulation and `use` options (device profile: viewport, user agent, device scale factor, touch, locale etc.; `baseURL`) still take effect in each test's new context, as they do today. | S-9 |
| AC-12 | On a failing test, trace, video and screenshot are still captured per the existing config (`retain-on-failure` / `on-first-retry` on CI / `only-on-failure`) and attached to the HTML report. A retried test runs in a fresh context. | S-9 |
| AC-13 *(rev 1)* | Subset runs work. `--project=<one UI project>` runs only that project's `setup_<project>` and starts only its shared browser. `--project=api` runs no setup project. `--grep` and `--shard` runs still execute only the selected tests and start at most one shared browser per UI project that runs (see A-8 for `--grep` selecting no UI tests). | S-8 |
| AC-14 *(rev 1)* | If `setup_<project>` cannot provide the shared browser, it is reported as failed with a message identifying the shared browser as the cause, and that project's tests do not run and do not hang. If the shared browser disconnects mid-run, the affected tests fail within their normal test timeout with an error identifying the shared browser as the cause. In both cases the other projects continue. | S-10 |
| AC-15 | The Jenkins pipeline runs green, except for the known environment gap, using the existing Docker image, credentials, stages and the SDET's CI worker count. No new secret or credential is introduced. Any new setting is configurable only through the repo's typed config module and is documented in `.env.example` and README. | S-9 |
| AC-16 *(rev 1)* | README (or equivalent user-facing doc) describes the execution model: one shared browser per UI project per run/shard, provided by `setup_<project>` dependency projects, and a fresh context per test. It also says that there is no global setup, how the setup/teardown entries appear in reports, how to run the verification tests, and when the cross-worker check skips. All references to the removed global setup are gone. | — |
| AC-17 | Repo quality gates pass on all changed files: `npx tsc --noEmit`, `npx eslint <files>`, `npx prettier --check <files>`. | — |
| AC-18 *(rev 1)* | Projects `setup_chromium`, `setup_firefox` and `setup_webkit` exist and are declared as dependencies of `chromium`, `firefox` and `webkit` respectively, one to one. No UI project depends on another engine's setup project. This is visible in the resolved project list (`--list`) or the config. | S-11 |
| AC-19 *(rev 1)* | The Playwright configuration declares **no** `globalSetup` and **no** `globalTeardown`. No code, test, config entry or doc for the previous global-setup/runner-process shared-browser mechanism remains in the change set, and no dead code is left for it. | S-11 |
| AC-20 *(rev 1)* | Any test defined in the new setup (and, if used, teardown) projects follows the repo tagging rules: a `tag` array with a classification tag and a unique kebab-case scenario tag per test. No unique tag is reused across the three engines' setup projects. | — |

## 7. Test data

- No application test data is needed. Verification tests use synthetic, locally generated values (e.g. a random
  cookie name or value per run) so leaking state can't be confused with a stale value.
- Existing Faker builders and SauceDemo static data are unchanged.
- No secrets. No new credentials.

## 8. Classification

- Every new or revised verification test uses the `tag` option with a classification tag and its own **unique**
  kebab-case scenario tag, never reused (e.g. `@shared-browser-across-workers`, `@isolated-context-per-test`,
  `@no-state-leak-between-tests`). The final names are the planner's choice, provided they are unique.
- *(rev 1)* Setup/teardown project tests are tagged too (AC-20), with a unique tag per engine (e.g.
  `@setup-shared-browser-chromium`). The names are the planner's choice.
- Classification default (ASSUMPTION A-6): `@regression` plus a framework-level grouping tag (`@framework`) so
  these infra checks can be included or excluded with `--grep`. They are **not** `@smoke`.
- Existing tests' tags must not change (AC-8).

## 9. Non-functional

- Reliability: no hard waits. The shared browser must be ready before any dependent test uses it, which the dependency
  ordering guarantees. Its failure must be surfaced quickly (AC-14).
- Resource hygiene: no orphaned browser processes (AC-7).
- Performance: none stated. Reduced browser launches are an expected side effect, not an acceptance criterion.
- Security: no secrets in code, logs or docs. Any endpoint used to reach the shared browser must not be
  exposed beyond the local machine or CI container, and any connection detail handed from a setup project to
  workers must not be committed to the repo (ASSUMPTION A-7).

## 10. Dependencies & risks

- **R-1 Known environment gap (not a code defect):** `@api-fetch-user-by-id` and `@api-create-user` need a real
  `/auth/login` backend. The local `API_BASE_URL` (jsonplaceholder) returns 404. Their failure is expected and is
  out of scope. See `.ai/context/automation-pipeline-learnings.md`.
- **R-2 Third-party sites:** existing UI specs hit playwright.dev and saucedemo.com. Site drift can cause failures
  unrelated to this change, so compare outcomes before and after on the same day.
- **R-3 (rev 1) Cross-worker sharing on CI:** CI now runs with 5 workers (the SDET's edit), so cross-worker sharing
  **is** demonstrable on CI and AC-6 expects the check to execute there. Sharding still creates separate builds or
  machines, each with its own browser per project. Whether ≥ 2 workers actually pick up tests of the same project
  depends on test count and scheduling, so the verification tests must be designed so that this reliably happens
  (or they skip with a reason, and never pass vacuously).
- **R-4 Headed shared browsers:** locally, headed mode shows one browser per project, with all tests'
  contexts as windows inside it. Several tests' windows may be visible at once. This is expected.
- **R-5 Engine parity:** workers connecting to one running browser has to work for all three engines, including
  WebKit on macOS and in the Linux Docker image. If one engine can't support it, the planner must flag this rather
  than silently fall back (Q-2).
- **R-6 Blast radius:** with one browser per project, a browser crash affects every in-flight test of that project.
  AC-14 covers the reporting side. Retries on CI give partial recovery.
- **R-7 (rev 1) Lifetime vs. setup worker:** a setup project runs as a test inside a worker process, and that worker
  may exit or be recycled (e.g. after a failure) before the dependent project's tests finish. The shared browser has
  to stay alive for the whole project, so the planner must make sure its lifetime is not tied to the setup worker's
  lifetime, while still guaranteeing shutdown (AC-7).
- **R-8 (rev 1) Interrupted runs:** Ctrl+C, a CI abort or a global timeout may stop the run before per-project teardown
  executes. Orphaned browser processes must still not remain, especially inside the long-lived Jenkins agent
  container (AC-7).
- **R-9 (rev 1) Report shape change:** setup (and any teardown) projects show up as extra entries in the HTML and
  JUnit reports and in test counts. This is expected and must be documented (AC-16). It must not be mistaken for
  new application coverage.
- **R-10 (rev 1) Filter semantics:** Playwright's filtering (`--grep`, `--last-failed`, `--only-changed`, etc.)
  interacts with dependency projects in ways the planner must check against 1.62.1 (see A-8).
- **R-11 Sandbox:** running `npx playwright test` inside the assistant sandbox produces false failures (Chromium
  `ProcessSingleton`, `ENOTFOUND`). All verification runs must use the sandbox override. This also applies to starting
  or connecting to a shared browser, which may need local ports or sockets.

## 11. Open questions / assumptions

None of these is blocking. Each has a safe default that the doc assumes. The SDET should confirm or override.

- **Q-1 / A-1 (interpretation):** "1 browser session in a project across multiple workers" is read as **one running
  browser instance per UI project per test run (per shard), provided by `setup_<project>`, which all of that
  project's worker processes connect to**. It is not read as one in-process browser object, which Playwright's
  process-per-worker model makes impossible.
- **Q-2 / A-2 (engine coverage):** the change applies to all three UI projects. If one engine proves infeasible, the
  default is to stop and report it as a blocker rather than exempt that engine silently.
- **Q-3 / A-3 (opt-out toggle):** default is that the shared-browser model is **always on**, with no toggle. If a toggle
  is added, it must follow the typed-config rule (AC-15).
- **Q-4 / A-4 (rev 1, CI workers):** the SDET's uncommitted `workers: process.env.CI ? 5 : undefined` is the intended
  CI worker count and is kept as is. This work must not revert or change it. As a result, cross-worker sharing is
  expected to be demonstrated on CI too (AC-6). The old "CI `workers: 1`" caveat is withdrawn.
- **Q-5 / A-5 (tooling modes):** `--ui` mode, `--debug` and IDE runs must keep working (tests can execute), but they
  don't need to demonstrate the shared browser. Verification tests use blank or locally rendered content, not
  external sites.
- **A-6 (tags):** verification tests are classified `@regression` + `@framework`, not `@smoke` (§8).
- **A-7 (exposure):** any endpoint for the shared browser is bound to the local machine or container only, and its
  connection details are runtime-only, never committed.
- **A-8 (rev 1, `--grep` selecting no UI tests):** preferred outcome is that no shared browser is started. If
  Playwright 1.62.1's dependency semantics still execute the `setup_*` projects in that case, that is acceptable
  provided the browser is also shut down, no orphan remains (AC-7), and all selected tests' outcomes are unchanged.
  The planner must record which behaviour was observed. `--project=api` must strictly start no browser (AC-9).
- **A-9 (rev 1, "setup_&lt;project&gt;" naming):** the names `setup_chromium`, `setup_firefox`, `setup_webkit` are taken
  literally from the SDET's text (underscore form) and are required exactly as written.
- **A-10 (rev 1, teardown placement):** "Remove the global setup function" is read as removing both global setup and
  any global teardown tied to the shared-browser feature. Shutdown moves to project-scoped lifecycle (setup project
  and/or paired teardown project).

## 12. Definition of done

- AC-1 to AC-20 are met. The verification tests are automated and pass on chromium, firefox and webkit, locally
  (default workers) and in CI mode (5 workers). The cross-worker check executes, and does not skip, in both.
- `setup_chromium` / `setup_firefox` / `setup_webkit` are wired as dependencies of their UI projects. No global
  setup or teardown remains, and the old global-setup mechanism's code and tests are removed.
- The full existing suite has the same outcomes as before the change on all projects, excluding the known
  `/auth/login` environment gap.
- No orphaned browser processes after completed, failed or interrupted runs.
- `tsc --noEmit`, ESLint and Prettier `--check` are clean on changed files. README is updated.
- `.ai/context/` rules are followed: every test run uses the sandbox override, and every new test (including
  setup/teardown project tests) has a `tag` array with a classification tag and a unique scenario tag. Headed
  exploration is only needed if a UI page flow is involved, and none is here. The verification tests use no external
  pages, so there is nothing to explore with codegen. The planner should record that rationale explicitly in the plan.
- The change passes code review (all scores ≥ 4) in the orchestration pipeline.

## Revision history

- 2026-09-29 — Orchestration run 1, cycle 1: initial draft from the first paragraph of the SDET requirement (AC-1..AC-17).
- 2026-09-30 — Orchestration run 2, cycle 1 (Revision 1, SDET requirement change, not a review finding): the second
  paragraph was added. Added per-project `setup_<project>` dependency projects (§2, S-11, AC-18), removal of global
  setup/teardown and of the previous mechanism (AC-19), tagging of setup-project tests (AC-20). AC-1/2/3 now
  state that contexts come from the project's own shared browser. AC-7/AC-14 are now project-scoped lifecycle and
  setup-failure semantics. AC-9/AC-13 now say the api project has no setup dependency. AC-6/Q-4/R-3 were revised for the
  SDET's CI `workers: 5`, so the cross-worker check must now execute on CI. AC-16 is now the docs update. New risks R-7 (lifetime vs setup
  worker), R-9 (report shape), R-10 (filter semantics). New assumptions A-8 to A-10. No existing AC was dropped or
  weakened. AC-6 was tightened (the check must execute where ≥ 2 workers exist), because the CI worker count changed.
