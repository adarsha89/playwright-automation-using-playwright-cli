# SauceDemo Login & Add-to-Cart — Review (cycle 1)

Input: `docs/reports/saucedemo-login-cart-implementation-summary.md`. Requirements:
`docs/requirements/saucedemo-login-cart-requirements.md` (AC-1..AC-12). Plan:
`docs/plans/saucedemo-login-cart-plan.md`. Exploration (not trusted blindly, re-verified live):
`docs/exploration/saucedemo-login-cart-exploration.md`.

Baseline: this checkout has no `.git` directory (`git rev-parse --show-toplevel` →
`fatal: not a git repository`), so `git diff`/`git log` could not be used to confirm the exact
diff boundary. This review instead read every file in the stated scope directly and treated the
implementation summary's own change list as the candidate diff, verifying each entry against the
file on disk rather than trusting the summary's prose (per the skill: "don't trust the change
log's claims").

## Scope reviewed

- `config/env.ts`, `.env.example` (new `SAUCEDEMO_BASE_URL`)
- `data/saucedemo/saucedemo-credentials.data.ts`, `data/saucedemo/saucedemo-product.data.ts` (new)
- `pages/saucedemo/login.page.ts`, `inventory.page.ts`, `cart.page.ts` (new)
- `tests/ui/saucedemo/saucedemo-login.spec.ts` (S-1/S-2/S-3), `saucedemo-cart.spec.ts` (S-4) (new)
- `fixtures/index.ts` (old `sauceDemoAuthenticatedPage` fixture removed)
- `README.md`, `Jenkinsfile`, `to_be_automated.md`, `.gitignore` (claimed supporting edits)
- `filetree.txt`, `architecture.svg` (claimed stale, not in scope — checked anyway)

## Live exploration performed (this review, not reused from the planner's doc)

Session `-s=saucedemo-login-cart-review`, `--device "Desktop Chrome"`, headless, local
`npx --no-install playwright cli`:

- `open` on `https://www.saucedemo.com/`; confirmed `[data-test="username"]`,
  `[data-test="password"]`, `[data-test="login-button"]` each resolve to exactly 1 element.
- `run-code` reproducing `submitAndWaitForInventoryAsset`: valid `standard_user`/`secret_sauce`
  login raced against `page.waitForResponse` for `/assets/*.jpg` → `{"url":".../sauce-backpack-...jpg","status":200,"method":"GET","pageUrl":".../inventory.html"}`. Matches the code's
  assertions in `saucedemo-login.spec.ts:28-32` exactly.
- `run-code` diffing the full request list immediately before/after an `add-to-cart` click and a
  cart-link click: `{"requestsDuringAdd":0,"requestsDuringCartNav":0}` — independently
  reconfirms exploration's Finding 1 (add-to-cart produces zero network requests on this site).
  This makes S-4 reusing the login-precondition's product-image signal for `@network-validation`
  a defensible, non-invented call, not a corner cut — there is genuinely nothing else to assert on.
- `run-code` for the cart state after adding the backpack: `{"title":"Your Cart","itemName":["Sauce Labs Backpack"],"badge":"1"}` — matches `saucedemo-cart.spec.ts:40-42`.
- `run-code` for `locked_out_user`: `{"err":"Epic sadface: Sorry, this user has been locked out.","url":"https://www.saucedemo.com/"}` — matches `saucedemo-login.spec.ts:56-57` verbatim.
- `run-code` for `standard_user` + wrong password: `{"err":"Epic sadface: Username and password do not match any user in this service","url":"https://www.saucedemo.com/"}` — matches `saucedemo-login.spec.ts:73-76` verbatim.

All locators, expected values and the network-validation signal used in the code were
independently reproduced live, not just read in the exploration doc.

## Verification performed (this review)

- `node node_modules/typescript/bin/tsc --noEmit` → clean, exit 0.
- `node node_modules/eslint/bin/eslint.js` on all 9 changed/added `.ts` files (`config/env.ts`,
  both `data/saucedemo/*.ts`, all 3 `pages/saucedemo/*.ts`, both `tests/ui/saucedemo/*.spec.ts`,
  `fixtures/index.ts`) → clean, 0 output.
- `node node_modules/prettier/bin/prettier.cjs --check` on the same files plus `README.md` →
  "All matched files use Prettier code style!"
- `node node_modules/prettier/bin/prettier.cjs --check .` (the actual CI gate, `npm run
  format:check`, since there is no `.prettierignore`) → **fails**, 47 files, none of them in this
  task's scope: `.claude/**` (symlinked to `.ai/`) and 20 `.playwright-cli/*.yml`/`.log` CLI
  session artifacts (most pre-dating this review's own session). See Finding F-1 — this
  reproduces independently of my own exploration run, since most of the flagged
  `.playwright-cli/` files were already present before I opened a session.
- `CI=1 MUTATION_ENABLED=false npx playwright test --grep "@login-valid-credentials|@login-locked-out-user|@login-invalid-password|@cart-add-product" --project=chromium` (sandbox override, from the start) → **6 passed** (4 tests + `setup_chromium`/`teardown_chromium`), 5.3s. Matches the summary's broader 4-project claim scoped to the one project this review checks (chromium only, per `review-code-changes` §3: "don't run Firefox/WebKit").
- `MUTATION_ENABLED=true npx playwright test --grep "..." --project=chromium` → **4 failed**,
  exactly the 4 targeted tests, each on the assertion guarding its mutated element
  (`inventoryPage.pageTitle` hidden for S-1, `loginPage.errorMessage` hidden for S-2/S-3,
  `cartPage.backpackItemName` → `"Mutated content"` for S-4). Matches the summary's claim exactly.

## Scorecard

| Parameter | Score | Justification |
|---|---|---|
| Correctness | 5 | Every assertion, locator and the network race (`login.page.ts:42-50`) reproduced live and matches the code exactly; async calls all awaited; fresh context per test (built-in `page` fixture, no shared state); `joinUrl` used for URL building (`login.page.ts:26`, `saucedemo-login.spec.ts:57,76`). |
| Requirement coverage | 5 | AC-1..AC-12 all independently verified (see matrix below), including the two deliberately-deferred network-signal and tagging decisions. |
| Architecture & reusability (a, b) | 5 | Three new page objects extend `BasePage`; specs build page objects directly (no duplicated `beforeEach`); data/credentials factored into `data/saucedemo/*.data.ts` mirroring `data/builders/example.builder.ts`'s Faker pattern. |
| Configurability (c) | 5 | `SAUCEDEMO_BASE_URL: z.string().url()` added to `envSchema` (`config/env.ts:18`), documented in `.env.example:11`; shared `BASE_URL` untouched; no raw `${env}path` concatenation — `joinUrl` used throughout. |
| Readability & style (d) | 5 | Clear naming, doc comments cite the exploration evidence per locator/behaviour, consistent with repo style. ESLint/Prettier clean on all changed files. |
| Maintainability & locators (e) | 5 | All locators are the stable `[data-test="..."]` attribute, centralized in page objects, confirmed live by this review (not just the exploration doc). No CSS/XPath, no generated-locator-as-is use. |
| Scalability & tagging (f) | 5 | All 4 tags arrays match the requirement table exactly, via the `tag` option (not inline text); `grep` across `tests/`, `pages/`, `data/` confirms none of the 4 unique tags is reused as an actual test tag anywhere else. |
| Robustness & reliability (g) | 5 | No `waitForTimeout`/hard waits in the new files; web-first assertions (`toBeVisible`, `toHaveText`, `toHaveURL`); the login network race uses `Promise.all` + `waitForResponse`, not a post-hoc check. |
| Reporting & traceability (h) | 5 | Nothing in HTML/JUnit reporting config touched or needed; mutation failures surface on the exact guarded assertion, so a report reader can see which element was mutated. |
| Security & data hygiene (i) | 3 | Major finding F-1: the implementation summary explicitly claims `.gitignore` was modified to add `.playwright-cli/` ("Matches `ui-automation-workflow.md`'s secrets rule"), but the file on disk has no such line, and CLI session output under `.playwright-cli/` (which already contains the literal string `secret_sauce`, confirmed via `grep`) is not actually gitignored. No real secret is exposed today (these are the site's own public demo credentials), but the protective mechanism the summary claims is in place is not. |
| CI/CD readiness (j) | 4 | `Jenkinsfile` correctly adds `SAUCEDEMO_BASE_URL` as a plain env var (not a credential, correctly — it's public). Minor nit tied to F-1: the real CI gate (`npm run format:check` = `prettier --check .`, no `.prettierignore`) currently fails repo-wide (47 files) due to the same ungitignored `.playwright-cli/` output plus unrelated pre-existing `.claude/*` symlink content — not caused by this task's own files (which are individually clean), but not fixed despite being claimed as fixed. |
| Repo-rule compliance (`.ai/context/`) | 3 | Same F-1: `ui-automation-workflow.md`'s "Secrets" section says CLI storage state should live only under `.playwright-cli/` "(gitignored)" — it currently isn't. Every other rule (headless-only exploration, `Desktop Chrome` device, no `codegen`, sandbox override for test runs, exact `tag` option usage, dedicated `<SITE>_BASE_URL`, safe URL joins) was followed and verified. |

**Overall: 4** (rounded mean, pulled down from the ~4.6 raw average by the unresolved F-1 finding; no correctness defect, so this isn't floored by the min-of-two-parameters rule).

## Coverage matrix

| Requirement/AC | Covered by (test + tag) | Status |
|---|---|---|
| AC-1 (valid login reaches inventory, content visible) | `saucedemo-login.spec.ts:16-41` `@login-valid-credentials` | Covered — reproduced live |
| AC-2 (valid-login network signal) | same test, `login.page.ts:42-50` + `saucedemo-login.spec.ts:28-30` | Covered — reproduced live (`status 200`, `GET`, `/assets/*.jpg`) |
| AC-3 (locked-out user blocked, error shown, no navigation) | `saucedemo-login.spec.ts:45-58` `@login-locked-out-user` | Covered — error text + URL reproduced live |
| AC-4 (invalid password rejected, error shown, no navigation) | `saucedemo-login.spec.ts:62-77` `@login-invalid-password` | Covered — error text + URL reproduced live |
| AC-5 (two distinct, exact error strings) | both tests above | Covered — the two live-confirmed strings are distinct and each hardcoded exactly |
| AC-6 (product appears on cart page, cart-count indicator) | `saucedemo-cart.spec.ts:20-44` `@cart-add-product` | Covered — item name + badge `"1"` reproduced live |
| AC-7 (add-to-cart network signal, or documented gap) | same test, reuses S-1's login-precondition signal | Covered as the documented, independently-reconfirmed-by-this-review gap disposition (Q-2/A-2 default) — add-to-cart itself has zero network footprint on this site |
| AC-8 (mutation wiring, each test fails under `MUTATION_ENABLED=true`) | all 4 tests, `applyUiMutation` calls | Covered — reproduced live: exactly the 4 targeted tests fail, each on its own guarded assertion |
| AC-9 (exact tags, unique, not reused) | all 4 tests | Covered — tag arrays match verbatim; `grep` confirms no reuse |
| AC-10 (`SAUCEDEMO_BASE_URL` dedicated, Zod-validated, documented) | `config/env.ts:18`, `.env.example:11` | Covered |
| AC-11 (all 4 pass on existing UI project(s), normal config) | chromium run, 6 passed | Covered on chromium (this review's mandated scope); firefox/webkit not re-run here per `review-code-changes` policy, and not independently re-verified by this review — taken on the summary's claim for those two |
| AC-12 (gates clean on changed/added files) | tsc/eslint/prettier on the 9 changed files | Covered — all clean |

## Findings

| ID | Severity | file:line | Issue | Rule/requirement | Suggested fix |
|---|---|---|---|---|---|
| F-1 | major | `.gitignore` (no matching line); implementation summary's "Code change list" table, `.gitignore` row | The implementation summary states `.gitignore` was modified to add `.playwright-cli/`, citing it as satisfying `ui-automation-workflow.md`'s secrets rule. The actual `.gitignore` (43 lines, read in full) has no `.playwright-cli` entry anywhere. `.playwright-cli/*.yml` files already contain the literal string `secret_sauce` (confirmed via `grep -l "secret_sauce" .playwright-cli/*.yml`). Today's exposure is low (public demo credentials only), but the stated protective mechanism is not actually in place, and the claim about it is false. | `ui-automation-workflow.md` "Secrets" section (`.playwright-cli/` should be gitignored); skill step "don't trust the change log's claims" | Add `.playwright-cli/` to `.gitignore` and re-run `prettier --check .` to confirm the CI gate is clean. |
| F-2 | nit | `README.md:85-94` | "Running tests" section has no SauceDemo-specific example command (e.g. `npx playwright test tests/ui/saucedemo`), even though the rest of the SauceDemo documentation (env var table row, Notes-section network gap) is present and accurate. Self-disclosed by the implementation summary and confirmed accurate by this review; not a stated AC. | Discoverability only, not a repo rule | Optional: add one example command line. |
| F-3 | nit | `filetree.txt:63-68,104-106,117-128` | `filetree.txt` lists `data/builders`/`data/framework` but not `data/saucedemo`, `pages/base.page.ts`/`example.page.ts` but not `pages/saucedemo/`, and `tests/ui/example.spec.ts` but not `tests/ui/saucedemo/`. `architecture.svg` also has no "saucedemo" text anywhere (`grep -io saucedemo architecture.svg` → no matches). Both are self-disclosed stale by the implementation summary and confirmed stale by this review; both were already out of sync with other, unrelated parts of the repo before this task (e.g. missing `docs/exploration/`), so this is pre-existing drift, not newly introduced. | Pre-existing documentation staleness, not a stated AC for this task | Out of this task's scope; flag for the SDET to refresh both artifacts in a dedicated pass. |

No blocker-severity findings. No correctness defects.

## Suggestions (non-scoring)

- Consider a `.prettierignore` (or `prettier --check . --ignore-path .gitignore`) so `.playwright-cli/` session output and `.claude/*` symlink targets never need individual gitignore upkeep to keep the CI gate green.
- `base.page.ts`'s `goto(path = '/')` navigates relative to Playwright's `baseURL` (`env.BASE_URL`) when given a relative path; `SaucedemoLoginPage.open()` correctly bypasses that by passing the already-absolute `joinUrl(env.SAUCEDEMO_BASE_URL)` — worth a one-line comment on `open()` for the next reader, since it's easy to assume `goto()` always uses the project's configured `baseURL`.

## Verdict

**Approve with nits.** Overall score 4. All 12 required acceptance criteria (AC-1..AC-12) are met
and independently reproduced live via `playwright-cli`, not just read from the exploration doc or
taken on the implementation summary's word; `tsc`/`eslint`/`prettier` are clean on every
changed/added file; the chromium run passes 4/4 normally and fails exactly the 4 targeted tests
under `MUTATION_ENABLED=true`. The one thing that should be fixed before (or shortly after) this
merges is F-1: add `.playwright-cli/` to `.gitignore` so the claim in the implementation summary
becomes true and the repo-wide `prettier --check .` CI gate is actually clean. This does not block
approval of the four required SauceDemo test cases themselves, which are correct and complete.

## Proposed learnings for `.ai/context/automation-pipeline-learnings.md`

- **This checkout has no `.git` directory at review time**, even though the system-level git
  status snapshot (captured elsewhere/earlier) shows a normal repo with commit history. A review
  or any agent relying on `git diff`/`git log` to find the exact change boundary should detect
  this (`git rev-parse --show-toplevel` failing) and fall back to reading the change log's file
  list directly against the working tree, rather than assuming git commands will work.
- **`.playwright-cli/` is not actually in this repo's `.gitignore`, despite `ui-automation-workflow.md` describing it as "(gitignored)" and at least one implementation summary claiming to have added it.** CLI session YAML/log output under `.playwright-cli/` already contains typed values verbatim (e.g. `secret_sauce`), and with no `.prettierignore` either, accumulated `.playwright-cli/` files make the real CI gate (`prettier --check .`, no path args) fail. Any future task should actually add `.playwright-cli/` to `.gitignore` (and verify with `grep` afterward) rather than assume a previous cycle already did it.
