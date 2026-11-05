# Shared browser per project (isolated context per test): implementation summary

Slug: `shared-browser-per-project` · Stage C (coding), orchestration run 2, cycle 1 · Date: 2026-09-30
Input for: `review-code-changes docs/reports/shared-browser-per-project-implementation-summary.md`

- Plan: `docs/plans/shared-browser-per-project-plan.md` (approved; SDET did not request a plan checkpoint)
- Requirements: `docs/requirements/shared-browser-per-project-requirements.md` (Revision 1, AC-1 to AC-20)
- Orchestration log: `docs/reports/shared-browser-per-project-orchestration-log.md`
- Exploration: **none, intentionally** (plan §1 and requirements §12). This is a runner/fixture infrastructure change. It plans and introduces **no application locators**. The verification tests render only a `context.route()` stub at the reserved `https://shared-browser.invalid/` origin, or no page at all. So `docs/exploration/shared-browser-per-project-codegen.ts` does not exist by design. The UI exploration gate in `make-code-changes` Step 1 has nothing to check. The plan's headed prototype (P-0 to P-13) is the behavioural evidence.

Nothing was committed or pushed.

## 0. Baseline (before this change)

| Check | Result |
|---|---|
| `npx tsc --noEmit` (run-1 tree) | exit 0 |
| `npx eslint .` (run-1 tree) | exit 0 |
| `npx prettier --check .` (run-1 tree) | clean |
| `npx playwright test --list` (run-1 tree) | `Total: 35 tests in 6 files` |
| Outcome at **HEAD** (V-5, via a throwaway `git worktree` of `HEAD` in the session scratchpad, since removed): `CI=1 npx playwright test --reporter=list --workers=4` | **15 passed** (all pre-existing UI tests on chromium/firefox/webkit), **2 failed** (`@api-fetch-user-by-id`, `@api-create-user`: the known `/auth/login` environment gap) |

## 1. Disposition of existing uncommitted work (plan §6.0)

| Path | Plan disposition | Applied | Reason |
|---|---|---|---|
| `.env.example` | Adapt (revert to HEAD) | **Reverted**: `git diff HEAD -- .env.example` is empty | Only change was the `PW_SHARED_BROWSER_BROKER_URL` comment. That var and `global-setup.ts` no longer exist, and the new design adds no env setting (A-3, AC-15) |
| `README.md` | Adapt | **Adapted** (§6.12) | Structure list and "Execution model" described the broker/globalSetup. Rewritten for setup/teardown projects; all broker/global-setup mentions removed (AC-16, AC-19) |
| `config/env.ts` | Adapt | **Adapted**: broker block deleted (`SHARED_BROWSER_BROKER_URL_VAR`, `brokerUrlSchema`, `setSharedBrowserBrokerUrl`, `getSharedBrowserBrokerUrl`); `isPlaywrightDebugMode()` kept, doc comment reworded | Broker-only code. The debug helper is still needed for the `--debug` fallback (Q-5) |
| `fixtures/index.ts` | Adapt | **Adapted** (§6.6) | Same pattern (override `connectOptions`, keep built-in `browser`/`context`/`page`). The endpoint now comes from the state file, not the broker HTTP API |
| `playwright.config.ts` | Adapt | **Adapted** (§6.7): `globalSetup` line and its comment removed; the three UI entries replaced by `sharedBrowserProjects(...)` | AC-18, AC-19. The SDET's `retries`/`workers` lines are **untouched** (see §6, D-1) |
| `data/builders/state-marker.builder.ts` | Keep | **Kept**, unchanged | Mechanism-independent Faker marker used by TC-1 to TC-4 |
| `data/framework/shared-browser.data.ts` | Adapt | **Adapted** (§6.9): header now points to plan §5/§6.9; private-key prefixes, `NONEXISTENT_BROWSER_EXECUTABLE`, `CRASHED_BROWSER_ERROR`, `FAKE_DEAD_SERVER_PID` added; all existing exports kept | Data for TC-5 to TC-7 |
| `fixtures/shared-browser/broker.ts` | Delete | **Deleted** | Runner-process HTTP broker, only meaningful with `globalSetup` (AC-19) |
| `fixtures/shared-browser/global-setup.ts` | Delete | **Deleted** | It is the global setup function the SDET asked to remove |
| `fixtures/shared-browser/client.ts` | Adapt | **Adapted** (§6.4): `SharedBrowserError` (re-exported, see D-2), `toSharedBrowserName`, `SHARED_BROWSER_CONNECT_TIMEOUT_MS` kept; all HTTP functions and broker timeouts deleted; `readReadySharedBrowser`, `waitForSharedBrowserVerdict`, `SHARED_BROWSER_VERDICT_TIMEOUT_MS` added | Worker-side readers of the state file |
| `fixtures/shared-browser/types.ts` | Adapt | **Adapted** (§6.2): names + launch options kept (`executablePath` added); all five broker wire schemas deleted; `sharedBrowserStateSchema` (ready/failed/crashed) and `sharedBrowserServerArgsSchema` added | New process-boundary contracts |
| `tests/ui/framework/shared-browser.spec.ts` | Adapt | **Adapted** (§6.10): probes use the attachment registry and state files; TC-3/TC-4 kept verbatim; TC-8 added; broker imports and `requireBrokerUrl` removed | TC-1 to TC-4, TC-8 |
| `tests/ui/framework/shared-browser-broker.spec.ts` | Delete | **Deleted** | Unit-tested the removed broker only. Its two tags are re-homed on TC-5/TC-6 in the new `shared-browser-errors.spec.ts` and remain unique (V-15) |
| `utils/browser-state.ts` | Keep | **Kept**, unchanged | Mechanism-independent cookie/storage/permission/route helpers |

## 2. Code change list

| File | Added/Modified/Deleted | What changed | Plan item |
|---|---|---|---|
| `fixtures/shared-browser/browser-server.mjs` | Added | Detached ESM server, `// @ts-check`. It `launchServer`s on `127.0.0.1` with signal handling off and Playwright's default unguessable ws path, and writes `ready`/`failed`/`crashed` state atomically (`0o600`, tmp + rename). A crash (`server.on('close')` outside shutdown) writes `crashed` and exits 1. SIGTERM/SIGINT/SIGHUP trigger a graceful close raced against 10 s, then `kill()`; the state is removed and the process exits 0 (re-entrancy guarded). A runner-pid watchdog runs every 1 s. No top-level `await` (`main().catch`). Never logs `wsEndpoint` | §6.1 |
| `fixtures/shared-browser/types.ts` | Modified (untracked → adapted) | See §1 | §6.2 |
| `fixtures/shared-browser/state.ts` | Added | Run dir `<tmpdir>/playwright-shared-browser/<runnerPid>/` (`0o700`), where `currentRunnerPid()` is `process.ppid`. Includes path helpers with project-name validation (`/^[\w.-]+$/`, no path traversal), schema-validated `readSharedBrowserState`, atomic `writeSharedBrowserState`, `removeSharedBrowserFiles`, the attachment registry (`registerWorkerAttachment`/`listAttachedWorkers`), `listSharedBrowserStates`, `isProcessAlive` (EPERM counts as alive; pid ≤ 0 is `false`), and `removeStaleRunDirs` (never kills) | §6.3 |
| `fixtures/shared-browser/client.ts` | Modified (untracked → adapted) | See §1. The five `readReadySharedBrowser` messages follow the plan's wording | §6.4 |
| `fixtures/shared-browser/errors.ts` | Added | `SharedBrowserError` moved here (deviation D-2) | §6.4 |
| `fixtures/shared-browser/lifecycle.ts` | Added | `startSharedBrowserServer`: stale cleanup (logged), stops any previous server for the key, validates args with Zod, spawns detached with stdio to the per-project log, then waits event-driven (`fs.watch` + child `exit`) up to 60 s. On `failed` it waits for the server to exit, then throws `setup_<p>: could not start the shared <engine> browser: <cause>` + 20-line log tail. On timeout it SIGKILLs the process group. `stopSharedBrowserServer`: SIGTERM, then waits for the **state file** to disappear (15 s), falling back to SIGKILL of `-browserPid`/`-serverPid`; files are always removed. `formatSharedBrowserStarted`/`formatSharedBrowserSummary` produce the CI log lines | §6.5 |
| `fixtures/shared-browser/projects.ts` | Added | `sharedBrowserProjects(name, use, testMatch)` returns `[setup_<n>, teardown_<n>, <n>]`. The setup project has a project-level `grep` on its per-engine tag and `teardown: teardown_<n>`; the UI project has `dependencies: [setup_<n>]`. Also tag/name helpers and `uiProjectFromSetupName`/`uiProjectFromTeardownName`. Type-only Playwright import | §6.7 |
| `fixtures/index.ts` | Modified | Worker fixture `sharedBrowser` (read state, register attachment; `null` under PWDEBUG), `connectOptions` override, and a `context` override that runs attribution only for failed tests whose error says the browser closed. Re-exports `SharedBrowserError` and `ReadySharedBrowserState`. Existing fixtures unchanged | §6.6 |
| `playwright.config.ts` | Modified | `globalSetup` removed. `projects` built from `sharedBrowserProjects('chromium' / 'firefox' / 'webkit', { ...devices[...] }, 'ui/**/*.spec.ts')`; `api` unchanged. Every other line unchanged | §6.7 |
| `config/env.ts` | Modified | Broker block removed; `isPlaywrightDebugMode()` kept. The diff vs HEAD is only that function | §6.8 |
| `data/framework/shared-browser.data.ts` | Modified (untracked → adapted) | See §1 | §6.9 |
| `tests/setup/shared-browser.setup.ts` | Added | SU-1..3 | §6.10 |
| `tests/setup/shared-browser.teardown.ts` | Added | TD-1..3 | §6.10 |
| `tests/ui/framework/shared-browser.spec.ts` | Modified (untracked → adapted) | TC-1, TC-2, TC-3, TC-4 (unchanged), TC-8 | §6.10 |
| `tests/ui/framework/shared-browser-errors.spec.ts` | Added | TC-5, TC-6, TC-7 | §6.10 |
| `tsconfig.json` | Modified | `"allowJs": true, "checkJs": true`; `include` adds `fixtures/shared-browser/browser-server.mjs` | §6.11 |
| `README.md` | Modified | Structure list (`fixtures/shared-browser/*`, `tests/setup/`); broker env paragraph removed; "Execution model" rewritten; verification commands and skip conditions; CI paragraph | §6.12 |
| `.env.example` | Reverted to HEAD | See §1 | §6.13 |
| `fixtures/shared-browser/broker.ts`, `fixtures/shared-browser/global-setup.ts`, `tests/ui/framework/shared-browser-broker.spec.ts` | Deleted | See §1 | §6.0 |
| `Jenkinsfile`, `to_be_automated.md` | Unchanged | As planned | §6.14, §6.15 |

Kept unchanged: `data/builders/state-marker.builder.ts`, `utils/browser-state.ts`.

## 3. Key excerpts

**Project triplet** (`fixtures/shared-browser/projects.ts`):

```ts
export function sharedBrowserProjects(name: SharedBrowserName, use: Project['use'], testMatch: string): Project[] {
  return [
    { name: setupProjectName(name), testMatch: SHARED_BROWSER_SETUP_FILE, grep: tagGrep(setupTag(name)), teardown: teardownProjectName(name), use },
    { name: teardownProjectName(name), testMatch: SHARED_BROWSER_TEARDOWN_FILE, grep: tagGrep(teardownTag(name)), use },
    { name, testMatch, dependencies: [setupProjectName(name)], use },
  ];
}
```

**Worker wiring** (`fixtures/index.ts`). Only `connectOptions` is overridden, so Playwright's built-in `browser` takes its `connect()` path (`node_modules/playwright/lib/index.js` l. 216-231, re-verified). `context`/`page` stay built-in, so every test gets a new context:

```ts
sharedBrowser: [async ({ browserName }, use, workerInfo) => {
  if (isPlaywrightDebugMode()) { logger.info('...per-worker browser...'); await use(null); return; }
  const state = readReadySharedBrowser(workerInfo.project.name, toSharedBrowserName(browserName));
  registerWorkerAttachment(workerInfo.project.name, workerInfo.workerIndex, process.pid);
  await use(state);
}, { scope: 'worker' }],
connectOptions: [async ({ sharedBrowser }, use) => {
  await use(sharedBrowser ? { wsEndpoint: sharedBrowser.wsEndpoint, timeout: SHARED_BROWSER_CONNECT_TIMEOUT_MS } : undefined);
}, { scope: 'worker' }],
```

`connectOptions` is only consumed by the built-in `browser` fixture (re-verified by grep), so the `api` project and the setup/teardown tests never instantiate `sharedBrowser`.

**Parametrization.** The setup and teardown files loop `for (const engine of SHARED_BROWSER_NAMES)` with tags `['@framework', setupTag(engine)]` / `teardownTag(engine)`. Each setup/teardown project selects its own engine's test through its project-level `grep`. The probes loop over `SHARED_BROWSER_PROBES` and take their unique tag from the data row.

## 4. Tests added / modified

All tests use the `tag` option. Unique tags were verified unique with a `--list --reporter=json` scan: 21 unique scenario tag sets across the suite, 0 duplicates.

| ID | Title | Tags | Project(s) |
|---|---|---|---|
| SU-1..3 | `starts the shared <engine> browser for the <engine> project` | `@framework`, `@setup-shared-browser-<engine>` | `setup_<engine>` |
| TD-1..3 | `stops the shared <engine> browser after the <engine> project` | `@framework`, `@teardown-shared-browser-<engine>` | `teardown_<engine>` |
| TC-1 | `uses the project's single shared browser from every worker (probe a)` | `@regression @framework @shared-browser-across-workers-probe-a` | chromium, firefox, webkit |
| TC-2 | `... (probe b)` | `@regression @framework @shared-browser-across-workers-probe-b` | all 3 UI |
| TC-3 | `first test in a worker writes cookies, storage, permissions and routes into its own context` (unchanged) | `@regression @framework @isolated-context-first-test-writes-state` | all 3 UI |
| TC-4 | `next test in the same worker gets a new context with none of that state` (unchanged) | `@regression @framework @isolated-context-next-test-starts-clean` | all 3 UI |
| TC-5 | `reports a shared browser that cannot start as a failed setup with its cause` | `@regression @framework @shared-browser-launch-failure-reported` | all 3 UI |
| TC-6 | `reports a crashed shared browser with the project, engine and server pid` | `@regression @framework @shared-browser-crash-reported` | all 3 UI |
| TC-7 | `reports a missing shared browser and points at the setup project` | `@regression @framework @shared-browser-missing-state-reported` | all 3 UI |
| TC-8 | `wires the project to its own setup_<project> dependency with no global setup` | `@regression @framework @shared-browser-project-wiring` | all 3 UI |

Pre-existing specs (`tests/ui/example.spec.ts`, `tests/ui/saucedemo/*`, `tests/api/example.spec.ts`) were **not edited**. Their titles, tags and steps are unchanged (AC-8). `npx playwright test --list`: `Total: 47 tests in 8 files` (was 35 tests in 6 files on the run-1 tree, 17 at HEAD). The 47 break down as 15 pre-existing UI + 2 API + 24 framework (8 per engine × 3: TC-1 to TC-8) + 6 setup/teardown (one per `setup_<engine>`/`teardown_<engine>` project, each selecting only its engine's test through the project-level `grep`).

## 5. Verification results

Every `npx playwright test` ran **with the sandbox override from the start** and `PW_TEST_HTML_REPORT_OPEN=never`. Process census: `pgrep -f browser-server.mjs` plus `pgrep -P <server>` sampled once all `started` lines had appeared. Orphan check: `pgrep -f browser-server.mjs` and `pgrep -f ms-playwright` after each run. Local machine: macOS, Node v26.10.0, Playwright 1.62.1, default local workers = 5.

### Static checks (final code)

| Step | Command | Result |
|---|---|---|
| V-1 | `npx tsc --noEmit` (`--listFiles` confirms `browser-server.mjs` is checked) | exit 0 |
| V-2 | `npx eslint playwright.config.ts config/env.ts fixtures data/framework data/builders/state-marker.builder.ts utils/browser-state.ts tests/setup tests/ui/framework` | exit 0 (0 errors, 0 warnings); `npx eslint .` exit 0 |
| V-3 | `npx prettier --check <same files> tsconfig.json README.md` | clean (after one `--write` of `fixtures/index.ts` and `state.ts`); `npx prettier --check .` clean repo-wide. `.env.example` has no Prettier parser and is byte-identical to HEAD |
| V-4 | AC-19 grep (plan §6.0) | Single hit: `tests/ui/framework/shared-browser.spec.ts:181: expect(testInfo.config.globalSetup).toBeNull();`. This is TC-8's AC-19 assertion itself, not a leftover (see D-5). `broker.ts`, `global-setup.ts` and `shared-browser-broker.spec.ts` are gone |
| V-15 | Tag uniqueness scan | 0 duplicates; 14 new or kept unique framework/setup/teardown tags |

### Test runs

| Step | Command | Result |
|---|---|---|
| V-6 | `npx playwright test --grep @framework --project=<e> --workers=2 --reporter=list`, headed, for chromium, firefox, webkit | **10 passed** per engine (setup + 8 + teardown). Probes **passed**, not skipped. Teardown: `2 workers attached`. 0 leftovers |
| V-7 | `npx playwright test --grep @framework --reporter=list`, headed, default 5 workers | **30 passed**. 3 distinct servers (74640 webkit / 74641 chromium / 74642 firefox), each with exactly one browser root child (`Google Chrome for Testing`, `firefox`, WebKit's `bash` launcher). Attached workers: chromium 4, firefox 3, webkit 3. 0 leftovers |
| V-7 (final code) | `npx playwright test --grep @framework --workers=2 --reporter=list`, headed | **30 passed**; 2 workers attached per engine; 0 leftovers |
| V-8 | `CI=1 npx playwright test --reporter=list` (config CI workers = 2, retries = 1, headless) | **45 passed, 2 failed** (only `@api-fetch-user-by-id` / `@api-create-user`, the known gap, each also failing its retry). All 15 pre-existing UI tests passed; all 6 probes executed and passed. `headless=true` in the started lines. 0 leftovers. Re-run on final code: same, **45 passed / 2 failed** |
| AC-8 local | `npx playwright test --project=chromium --project=firefox --project=webkit --reporter=list`, headed, 5 workers | **45 passed** (15 pre-existing UI + 24 framework + 6 setup/teardown); 5 workers attached per engine; 0 leftovers |
| AC-8 compare | HEAD baseline vs after | Pre-existing UI: 15/15 pass before and after. API: 2/2 fail before and after (known gap). **Same outcome** |
| V-12 | `CI=1 ... --project=api` | 2 failed (known gap); only `[api]` ran; **max concurrent servers seen: 0** (sampled every 50 ms over the whole run) |
| V-12 | `CI=1 ... --grep @api` | same as above: no setup project, 0 servers (A-8 preferred outcome) |
| V-12 | `CI=1 ... --project=chromium` | **15 passed**; only `setup_chromium`, `[chromium]`, `teardown_chromium` ran. Max 2 concurrent `browser-server.mjs` = the real chromium server plus TC-5's private launch-failure server, which launches no browser |
| V-12 | `CI=1 ... --shard=1/3` | 18 passed; setup/teardown for chromium + firefox only |
| V-12 | `CI=1 ... --shard=2/3` | 18 passed; firefox + webkit only |
| V-12 | `CI=1 ... --shard=3/3` | 13 passed, 2 failed (known api gap); webkit + api only |
| V-13 | `CI=1 ... --workers=1 --grep "@shared-browser-across-workers\|@isolated-context"` | **6 skipped** (both probes × 3 engines), 12 passed (isolation + setup/teardown). Skip annotation: `Cross-worker sharing needs >= 2 workers; this run uses 1 (--workers=1). Isolation tests still ran.` |
| V-9 | Scratch spec (deleted afterwards), `CI=1 --project=<e> --workers=1 --retries=0`, test does `process.kill(-browserPid, 'SIGKILL')` | All 3 engines: the in-flight test failed with `page.evaluate: Browser closed` **plus** `SharedBrowserError: [shared-browser] Shared <e> browser for project "<e>" (server pid N) is crashed: <e> browser process exited unexpectedly during this test` (chromium 55 ms, firefox 257 ms, webkit 210 ms). The next test failed in **0 ms** with the same attributable error. Teardown passed (`not-running ... last status crashed`). 0 leftovers |
| V-14 | Same scratch spec, ordinary `expect(1).toBe(2)`, `CI=1 --retries=1` | All 3 engines: `test-failed-1.png` + `video.webm` + `error-context.md` on the first attempt, plus `trace.zip` on `-retry1` (`on-first-retry`). The retry ran in a new worker/context. `SharedBrowserError` appeared **0** times: no false blame |
| V-10 | Temporary `launchOptions: { executablePath: '/nonexistent/browser' }` on firefox (config restored; `cmp` identical), `CI=1 --workers=4` | `setup_firefox` **failed** (plus its CI retry) with `[shared-browser] setup_firefox: could not start the shared firefox browser: Failed to launch firefox because executable doesn't exist at /nonexistent/browser` and the server log tail. **13 did not run** (firefox), 31 passed (chromium, webkit, their setup/teardown), 2 failed = api gap plus setup_firefox. No hang (7.1 s). `teardown_firefox` ran (`not-running ... last status failed`). 0 leftovers |
| V-11 | `interrupt.sh`: runner started in its own process group; once 3 `started` lines appeared: (a) `kill -INT -<pgid>`, (b) `kill -TERM <runner>`, (c) `kill -KILL <runner>` | All 3 cases: **0 teardown lines** (as P-6 predicted), yet **0 servers / 0 browsers after 3 s**. Every server log says `shutting down: runner pid N is gone`. The next normal run logged `removed leftover state of finished runs: 79205` and passed 30/30 |
| V-11b | `CI=1 ... --workers=4 --global-timeout=4000` | `Timed out waiting 4s for the teardown for test suite to run`; 0 servers / 0 browsers 3 s later |
| V-16 | `--ui` smoke | **Not verified**: interactive, no human present (plan R-4) |

After all runs: `pgrep -f browser-server.mjs` = 0, `pgrep -f ms-playwright` = 0, and `<tmpdir>/playwright-shared-browser/` is empty.

## 6. Deviations from the plan, and issues fixed in the loop

- **D-1: SDET `workers`/`retries` lines differ from the plan's text. Kept as found.** The plan and the caller refer to `workers: process.env.CI ? 5 : undefined`. The working tree at the start of this stage actually had `workers: process.env.CI ? 2 : undefined` and `retries: process.env.CI ? 1 : 0` (HEAD: `1` and `2`). Neither the run-1 implementer nor the planner authored these; they are SDET edits. The binding instruction is "keep the SDET's line unchanged", so both lines were left **byte-identical to the working tree**, not rewritten to `5`. Effect: CI mode runs 2 workers. That is still ≥ 2, so the cross-worker probes execute on CI (verified in V-8, AC-6 met). README now says "CI runs more than one worker" rather than quoting a number. **The orchestrator/SDET should confirm 2 vs 5.** No code depends on the value.
- **D-2: `SharedBrowserError` lives in the new `fixtures/shared-browser/errors.ts`, re-exported from `client.ts`.** `state.ts` (malformed state) and `client.ts` (which imports `state.ts`) both throw it. Keeping it in `client.ts` would create a `client` ↔ `state` import cycle, and `projects.ts` (loaded by the config in every process) also needs it without pulling in `fs`-heavy modules. The public API is unchanged: `client.ts` and `fixtures/index.ts` still export it.
- **D-3: `waitForSharedBrowserVerdict` treats `disconnected` as a trigger to re-check, not as an immediate verdict.** The plan says it "resolves as soon as ... `browser` emits `disconnected`". If it resolved then, a disconnect that beats the server's `crashed` write (P-3a) would produce a generic message. On `disconnected` it re-reads the state and keeps waiting (same 5 s bound). It returns `'disconnected'` only if no verdict arrives. V-9 showed the full `... is crashed ...` message on all 3 engines.
- **D-4: Extra log line.** `startSharedBrowserServer` logs `[shared-browser] removed leftover state of finished runs: <pids>` when `removeStaleRunDirs()` removed something. The plan's V-11 expects the next run to "log stale-dir removal", but §6.3/§6.5 did not specify the log call. Because the three setups run concurrently, more than one may log the same pid. Removal is idempotent (`rm -rf` with `force`).
- **D-5: The AC-19 grep is not literally empty.** Its one hit is TC-8's `expect(testInfo.config.globalSetup).toBeNull()`, which the plan itself requires (§5 TC-8). The grep pattern cannot tell the assertion apart from a leftover. There is no other hit.
- **D-6: Small safety additions not spelled out in the plan.** In `state.ts`: project-name validation for file paths, and `isProcessAlive(pid <= 0) === false` (so `kill(0, 0)`, the process group, is never read as "alive"). In `lifecycle.ts`: on a `failed` launch, wait for the server to exit before throwing, so TC-5 can assert no process is left. In `browser-server.mjs`: a `ready` state is never written if a stop signal arrived during launch, and a missing `server.process().pid` is reported as `failed`. The teardown test also asserts the attachment registry is gone. TC-6's regex uses the `i` flag, because the plan's regex (`/shared \w+ browser .../`) is lowercase while the plan's §6.4 message starts with `Shared`.
- **Lint/type loop:** tsc and ESLint were clean on the first pass. Prettier reformatted `fixtures/index.ts` and `fixtures/shared-browser/state.ts` (line wrapping only). No `any`, no `eslint-disable` beyond the two pre-existing, justified `playwright/no-skipped-test` runtime skips in the probes, and no skipped or deleted assertions.
- **Verification tooling:** the first V-6 census sampled before the browser had launched, and zsh does not word-split `$S` for `pgrep -P`. It was replaced by a bash script that waits for the `started` lines. The first V-10 attempt used `timeout`, which macOS lacks (exit 127, nothing ran). It was re-run without it, and the config was restored and verified with `cmp` both times.

## 7. Known issues / follow-ups

1. **Linux/Docker (Jenkins) not verified locally** (plan R-1). On the first Jenkins build, check for 3 `started` + 3 `stopped` lines, green `@framework`, and executed probes. A WebKit-in-Docker failure is a blocker per A-2. Optional hardening (not done, not required): `args '--init'` on the Jenkins docker agent to reap reparented server processes.
2. **CI worker count** 2 vs 5: see D-1. The SDET should confirm. The comment above the `workers` line ("Opt out of parallel tests on CI.") no longer matches either value; it was left untouched as instructed.
3. **`--ui` / IDE / `--debug`** not exercised (interactive; plan R-4, V-16).
4. **Known environment gap:** `@api-fetch-user-by-id` / `@api-create-user` fail against the jsonplaceholder `API_BASE_URL` (no `/auth/login`). This is unchanged by this work and is not a defect.
5. **Windows** is unsupported (process-group signals), as documented in the `lifecycle.ts` header and README.
6. Learnings (a)-(f) proposed in plan §6.16 are for the learnings stage. All were re-observed in this stage: the watchdog cleaned up interrupts where teardown did not run (b); shard/grep behaviour (c); WebKit's `bash` root (d); the attribution wait (e); `checkJs` + no top-level await (f).

Next: `review-code-changes docs/reports/shared-browser-per-project-implementation-summary.md` (`code-review-agent`).
