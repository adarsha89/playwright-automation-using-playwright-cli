# Code review: shared browser per project (isolated context per test), cycle 1

Slug: `shared-browser-per-project` · Stage D (review), orchestration run 2, cycle 1 of 5 · Date: 2026-09-30 · Reviewer: `code-review-agent`
Previous review: none. This is the first review of this slug.

## 1. Scope reviewed and verification

**Inputs**
- Change log: `docs/reports/shared-browser-per-project-implementation-summary.md`
- Requirements: `docs/requirements/shared-browser-per-project-requirements.md` (Revision 1, AC-1 to AC-20)
- Plan: `docs/plans/shared-browser-per-project-plan.md`
- Exploration: none. This matches the plan and requirements §12, because the change is runner/fixture infrastructure with no application locators. The only page the tests render is a `context.route()` stub at `https://shared-browser.invalid/`. I accept this rationale: `ui-automation-workflow.md` covers application pages, and none is touched.

**Diff base:** `HEAD` = `23bb1dd` plus the working tree. Nothing is committed.
- Modified (tracked): `README.md`, `config/env.ts`, `fixtures/index.ts`, `playwright.config.ts`, `tsconfig.json`
- Untracked (new): `data/builders/state-marker.builder.ts`, `data/framework/shared-browser.data.ts`, `fixtures/shared-browser/{browser-server.mjs,client.ts,errors.ts,lifecycle.ts,projects.ts,state.ts,types.ts}`, `tests/setup/shared-browser.{setup,teardown}.ts`, `tests/ui/framework/shared-browser{,-errors}.spec.ts`, `utils/browser-state.ts`
- `.env.example` and `Jenkinsfile`: no diff against `HEAD`, which is correct.
- The change log's file list matches `git status --untracked-files=all` exactly. No omissions.
- `HEAD:playwright.config.ts` never had a `globalSetup`. The global setup that was removed was run 1's uncommitted `fixtures/shared-browser/global-setup.ts`. It is gone, together with `broker.ts` and `shared-browser-broker.spec.ts`.

**Verification I re-ran myself.** Every `npx playwright test` ran with the sandbox override from the start. Each run used a bash sampler that polled `pgrep -f browser-server.mjs` every 100 ms, and after each run it checked `browser-server.mjs`, `ms-playwright` and `<tmpdir>/playwright-shared-browser/`.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0. `--listFiles` includes `fixtures/shared-browser/browser-server.mjs`, so `checkJs` is active |
| Lint | `npx eslint --max-warnings 0 playwright.config.ts config/env.ts fixtures data utils tests` | 26 files, 0 errors, 0 warnings (all 14 new files included) |
| Format | `npx prettier --check <changed files> tsconfig.json README.md`; `npx prettier --check .` | clean; clean repo-wide |
| List | `npx playwright test --list` | `Total: 47 tests in 8 files` (as claimed) |
| Dependency selection | `--list --grep @login-valid-credentials`; `--list --grep-invert @framework`; `--list --project=api` | setup_/teardown_ for all 3 engines are pulled in as dependencies even when the CLI grep excludes `@framework`. api-only lists no setup project |
| Tag uniqueness | `--list --reporter=json` scan | 22 unique scenario tags. The only multi-use tag is the pre-existing `@network-validation` on `cart.spec.ts`/`login.spec.ts`, which this change did not touch |
| **@framework, 2 workers, 3 engines, headed** | `npx playwright test --grep @framework --workers=2 --reporter=list` | **30 passed**. Both probes **executed and passed** on every engine (not skipped). 3 `started` lines (headless=false) and 3 `stopped ... 2 workers attached`. 6 distinct server pids = 3 real + 3 TC-5 launch-failure servers that launch no browser. **After: 0 servers, 0 `ms-playwright`, state root empty** |
| **Full suite, CI mode** | `CI=1 npx playwright test --reporter=list` (config: 2 workers, 1 retry) | **45 passed, 2 failed**. The 2 failures are `@api-fetch-user-by-id` / `@api-create-user`, each also failing its retry: the known `/auth/login` environment gap, not scored. All 15 pre-existing UI tests passed. Probes executed. `headless=true`. 0 leftovers |
| Single worker | `CI=1 ... --grep @framework --project=chromium --workers=1` | 8 passed, **2 skipped** (the probes, with the documented reason). 0 leftovers |
| api only | `CI=1 ... --project=api` | only `[api]` ran (2 failed, known gap). **Max concurrent servers: 0** |
| Interrupt (AC-7) | full `CI=1` run in its own process group; `kill -KILL -<pgid>` once 3 `started` lines appeared | 0 teardown lines, as expected. **0 servers, 0 browsers 4 s later** (runner watchdog). 1 stale run dir left |
| Next run after the interrupt | `CI=1 ... --project=chromium --grep @shared-browser-project-wiring` | logged `removed leftover state of finished runs: 83024`, 3 passed, state root empty |
| Final orphan census | `pgrep -f browser-server.mjs`, `pgrep -f ms-playwright`, `ls <tmpdir>/playwright-shared-browser` | 0 / 0 / empty |

I did not re-run these change-log claims: V-9 (real crash via scratch spec), V-10 (setup failure via temporary config edit), V-11b (`--global-timeout`) and V-14 (artifacts on failure). Re-running them would mean modifying code or config, and this review is read-only. The mechanisms behind them are covered by TC-5/TC-6 and by my own interrupt run. Linux/Docker (Jenkins) is not verifiable here (F-5).

## 2. Scorecard

| Parameter | Score | Justification |
|---|---|---|
| Correctness | 4 | All assertions prove what they claim, and every run was green with no false passes. The probes skip rather than pass vacuously. Only nits/minors: F-1 (an unreachable branch with a misleading comment in the stop-during-launch path, no orphan risk because playwright-core's exit handler kills a half-launched browser) and F-2 (the attachment registry is written before connect) |
| Requirement coverage | 4 | AC-1 to AC-20 are all addressed (matrix §3). AC-15 (green Jenkins/Linux run) cannot be proven locally (F-5). AC-14's "dependent tests did not run" path is verified only manually, which AC-5 does not require to be automated (F-3) |
| Architecture & reusability (a, b) | 5 | Specs only orchestrate. The mechanism lives in `fixtures/shared-browser/*` behind `sharedBrowserProjects()`. The fixture overrides only `connectOptions`, so the built-in `browser`/`context`/`page` provide the new context per test without per-spec edits (AC-8). Data sits in `data/`, helpers in `utils/`, and the error type sits in its own module to avoid an import cycle |
| Configurability (c) | 5 | No new setting or env var. `process.env.PWDEBUG` is read only in `config/env.ts:45-48`. Projects are built from one helper per engine, and `api` is untouched |
| Readability & style (d) | 4 | tsc/ESLint/Prettier are clean, titles are descriptive, and the module headers are clear. One misleading comment (F-1) |
| Maintainability & locators (e) | 5 | No locators are introduced. Process-boundary contracts are Zod-validated in one place (`types.ts`), and the server script is type-checked through `checkJs` |
| Scalability & tagging (f) | 5 | Every new test has a `tag` array with classification and a unique scenario tag, with no duplicates. `--shard`, `--grep` and `--project` subsets verified. `fullyParallel` is retained |
| Robustness & reliability (g) | 4 | No hard waits: waits are event-driven via `fs.watch` plus the child `exit` event, each with a bound. The watchdog covers interrupts (verified). Stale-dir cleanup is verified. Minor: F-1 |
| Reporting & traceability (h) | 4 | Setup and teardown log one line per engine, add `shared-browser` annotations and appear as named report entries (documented). Nit: F-4 (a failed assertion could print the ws endpoint into reports) |
| Security & data hygiene (i) | 4 | Loopback-only server with Playwright's unguessable ws path. State lives outside the repo (`0o700` dirs, `0o600` files). No secrets. Faker markers. Nit: F-4 |
| CI/CD readiness (j) | 4 | Jenkinsfile is unchanged and needs no new credentials. CI mode verified locally (headless, 2 workers, retries). Minor: F-5 (Linux/Docker path unverified: reparenting without an init process, WebKit in Docker) |
| Repo-rule compliance (`.ai/context/`) | 5 | Tags use the `tag` option with a unique kebab-case tag per test. Every test run used the sandbox override. Prettier was included in verification. Flat ESLint config. No new site, so no `<SITE>_BASE_URL` needed. `joinUrl` is used for URL building (`utils/browser-state.ts:48,54,69`). The exploration rationale is recorded |
| **Overall** | **4** | min(Correctness 4, Coverage 4) = 4. The mean of all 12 is 4.42, which rounds to 4 |

## 3. Coverage matrix

| Requirement/AC | Covered by (test + tag) | Status |
|---|---|---|
| AC-1 one browser per project across ≥ 2 workers, from its setup | TC-1/TC-2 `@shared-browser-across-workers-probe-a`/`-b` (endpoint == setup state, ≥ 2 worker pids attached), SU-1..3 `@setup-shared-browser-<engine>`; my census: one real server per engine | covered |
| AC-2 distinct instance per engine | TC-1/TC-2 lines 84-90 (other projects' server/browser pids and engines differ) | covered |
| AC-3 new context per test, closed at end | TC-3/TC-4 `@isolated-context-first-test-writes-state` / `@isolated-context-next-test-starts-clean` (`not.toBe(previousContext)`, `previousContextClosed`), TC-1/TC-2 `browser.contexts()` length 1 | covered |
| AC-4 no leakage of cookies/storage/permissions/routes | TC-3/TC-4 (same worker); TC-1/TC-2 line 93 (cross-worker, same browser) | covered |
| AC-5 verification tests on 3 engines, local + CI, no external site | `@framework` on chromium/firefox/webkit; verified headed (2 workers) and `CI=1` | covered |
| AC-6 cross-worker check executes with ≥ 2 workers, skips with a reason at 1 | TC-1/TC-2 runtime skips; verified executed at 2 workers (local and CI) and skipped at `--workers=1` | covered |
| AC-7 no orphans after complete/fail/interrupt; per-project shutdown | TD-1..3 `@teardown-shared-browser-<engine>`; watchdog in `browser-server.mjs:115-119`; verified by my SIGKILL run + next-run cleanup | covered |
| AC-8 existing tests unchanged, same outcome | not edited; `CI=1` full run: 15/15 pre-existing UI passed | covered |
| AC-9 api has no setup dependency, starts no browser | TC-8 `@shared-browser-project-wiring` (line 180); `--project=api` census = 0 servers | covered |
| AC-10 headed locally / headless on CI | SU-1..3 `expect(state.headless).toBe(headless)`; `headless=false`/`true` in started lines | covered |
| AC-11 per-project emulation and `baseURL` in each context | built-in `context` fixture unchanged (`fixtures/index.ts:111-128` only wraps it); pre-existing UI specs pass | covered |
| AC-12 artifacts on failure, fresh context on retry | built-in fixtures unchanged; change-log V-14 (not re-run, see §1) | covered (by construction and change-log evidence) |
| AC-13 subset runs (`--project`, `--grep`, `--shard`) | verified `--project=api`, `--grep` lists; change-log V-12 shards | covered |
| AC-14 setup failure attributed, dependents do not run; crash attributed | TC-5 `@shared-browser-launch-failure-reported`, TC-6 `@shared-browser-crash-reported`, TC-7 `@shared-browser-missing-state-reported`; dependent "did not run" only via change-log V-10 | covered (partial automation, F-3) |
| AC-15 Jenkins green, no new secrets, no new setting | no new secrets or settings; CI mode verified locally only | partial (F-5, not verifiable here) |
| AC-16 README execution model, setup/teardown in reports, verification commands, skip conditions, no global-setup references | `README.md` §"Execution model: one shared browser per UI project" and the CI paragraph | covered |
| AC-17 tsc/eslint/prettier clean | §1 | covered |
| AC-18 `setup_<engine>` one-to-one dependencies | `fixtures/shared-browser/projects.ts:83-104`; TC-8 lines 172-179; `--list` | covered |
| AC-19 no `globalSetup`/`globalTeardown`, no leftover mechanism | `playwright.config.ts` (none); TC-8 lines 181-182; grep outside `docs/` finds only TC-8's assertion, its title and two "no global setup" doc sentences | covered |
| AC-20 setup/teardown tests tagged with a unique per-engine tag | `tests/setup/shared-browser.setup.ts:26`, `teardown.ts:21` (`@framework` + `@setup-/@teardown-shared-browser-<engine>`, as the plan specifies) | covered |

## 4. Findings (most severe first)

No blocker and no major findings.

| ID | Severity | file:line | Issue | Rule/requirement | Suggested fix |
|---|---|---|---|---|---|
| F-5 | minor | `Jenkinsfile:4` (unchanged), `fixtures/shared-browser/lifecycle.ts:242-266` | The Linux/Docker CI path is unverified. The detached server is reparented inside a container with no init process, and WebKit's `bash` launcher may behave differently. Stop waits on the state file rather than the pid, which mitigates the zombie case, but nothing has been run on Linux. The change log records this (§7.1) | AC-15, principle j | On the first Jenkins build, confirm 3 `started` + 3 `stopped` lines, green `@framework` with probes executed, and no leftover processes. Consider `args '--init'` on the docker agent |
| F-1 | minor | `fixtures/shared-browser/browser-server.mjs:78-98`, `:135-137` | If SIGTERM/SIGINT or the watchdog fires while `launchServer` is still pending, `shutdown()` sees `server === undefined` and calls `process.exit(0)` synchronously. The guard at 135-137 is therefore unreachable, and its comment ("shutdown() is already closing it") is false. The half-launched browser is still killed by playwright-core's `exit` handler (`killSet`/`killProcessAndCleanup`, `node_modules/playwright-core/lib/coreBundle.js:8964,9004`), so there is no orphan. The code misstates its own guarantee, though | principle d/g (accurate, deterministic shutdown) | Either keep a `launching` promise and have `shutdown()` await it before closing, or delete the dead guard and correct the comment to say that playwright-core's exit handler reaps the in-flight launch |
| F-2 | nit | `fixtures/index.ts:90-91`; `tests/ui/framework/shared-browser.spec.ts:66-82` | `registerWorkerAttachment` runs when the worker reads the state, before the built-in `browser` fixture connects. So "attached" means "resolved the shared endpoint", not "connected". The probe's ≥ 2-worker evidence is still sound: every browser-using test asserts its own endpoint and engine, and a failed connect fails the test. The name and README wording overstate it slightly | AC-1 evidence precision | Register the attachment from a worker fixture that depends on `browser` (after connect), or rename it to "resolved" in the code and README |
| F-3 | nit | `tests/ui/framework/shared-browser-errors.spec.ts:38` | The title says "reports a shared browser that cannot start **as a failed setup**", but the test calls `startSharedBrowserServer` directly under a private key. The "setup project failed, dependents did not run" semantics of AC-14 are verified only manually (change-log V-10) | AC-14 (automation not required by AC-5) | Reword the title (e.g. "... reports the launch failure with its cause"), or document in the spec header that the dependency semantics were verified manually |
| F-4 | nit | `tests/ui/framework/shared-browser.spec.ts:53-54` | `expect(connectOptions?.wsEndpoint).toBe(shared.wsEndpoint)` and `expect(readSharedBrowserState(...)).toEqual(shared)` would print the ws endpoint into the HTML/JUnit report on failure. That contradicts the "never log the wsEndpoint" contract (`browser-server.mjs:21`, `types.ts:45`). Impact is negligible: the endpoint is loopback-only, dies with the run, and `reports/`, `test-results/` and `playwright-report/` are gitignored | requirements §9 / A-7 | Compare `expect(connectOptions?.wsEndpoint === shared.wsEndpoint, 'connect endpoint matches the setup state').toBe(true)`, and compare the state without the endpoint field |

**Observation (not scored, SDET-owned config).** `playwright.config.ts:14` `retries: process.env.CI ? 1 : 0` and `:16` `workers: process.env.CI ? 2 : undefined` differ from `HEAD` (`2` / `1`). They also differ from the "5 CI workers" that requirements §3, AC-5, AC-6, Q-4 and §12 cite. The orchestrator and the implementer both say they did not make this edit (change-log D-1), so it is treated as SDET config outside this change. Effects: CI retries drop from 2 to 1 (principle g), and the comment at `:15` ("Opt out of parallel tests on CI.") is now stale. With 2 CI workers the cross-worker probes still execute, which I verified, so AC-6 holds either way. **The SDET should confirm 2 vs 5 workers and 1 vs 2 retries**, and the requirements text should be aligned with the answer.

## 5. Suggestions (non-scoring)

- TC-1/TC-2 could additionally assert at the process level that the shared server has exactly one browser root child. Today "one browser per project" follows from the design (one `launchServer` per setup run) plus my census, not from a test assertion.
- `fixtures/index.ts:21-33` (`sharedBrowserFailureMessage`) could move to `fixtures/shared-browser/client.ts`, which would keep `fixtures/index.ts` to fixture wiring only.
- `README.md` could briefly note that `--last-failed`/`--only-changed` still pull in `setup_*`/`teardown_*` as dependencies. That is Playwright behaviour, not a defect.

## 6. Verdict

**Approve with nits.** Overall 4. Every parameter scores ≥ 4, and there is no blocker or major finding.

Nothing must change for approval. Recommended before merge: fix or re-comment F-1, and have the SDET confirm the CI `workers`/`retries` values (observation). Recommended after merge: confirm F-5 on the first Jenkins build.

## 7. Proposed new learnings for `.ai/context/automation-pipeline-learnings.md`

- **Playwright dependency (setup) projects are not filtered by CLI `--grep`/`--grep-invert`.** They still run whenever a selected test's project depends on them, and they drop out when no test of the dependent project is selected. Evidence: `npx playwright test --list --grep-invert @framework` still lists `setup_*`/`teardown_*` for all three engines even though those tests are tagged `@framework`, and `--project=api` / `--grep @api` list no setup project (Playwright 1.62.1). So tagging setup tests with a group tag such as `@framework` is safe, and excluding that group can't accidentally break UI runs.
- **A test runner that is SIGKILLed never runs teardown projects. Anything a setup project spawns detached must watch the runner pid itself.** Evidence: `kill -KILL -<pgid>` mid-run produced 0 teardown lines, yet the `browser-server.mjs` watchdog (a runner-pid liveness check every 1 s) left 0 servers and 0 browsers within 4 s, and the next run removed the stale state dir. Reuse this pattern for any future long-lived helper process started from a setup project.
- **When reviewing process-lifecycle code, check which Playwright-internal exit handlers already cover a race before calling it an orphan risk.** playwright-core registers a process `exit` handler that kills browsers it launched (`killSet` → `killProcessAndCleanup` in `node_modules/playwright-core/lib/coreBundle.js`). So a `process.exit()` during a pending `launchServer()` does not orphan the browser (F-1 above).
