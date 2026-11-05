# SauceDemo Login & Add-to-Cart — Implementation Summary

Plan: `docs/plans/saucedemo-login-cart-plan.md`. Requirements:
`docs/requirements/saucedemo-login-cart-requirements.md`. Exploration:
`docs/exploration/saucedemo-login-cart-exploration.md`.

## Context

This cycle's job was not to write new code from scratch: an earlier, interrupted run had already
written the full implementation against this exact plan, and a second agent (the planner)
re-verified it live via `playwright-cli` and ran `tsc`/`eslint`/`prettier` read-only with no
issues found. What had **not** happened yet was: a from-scratch re-verification of every
acceptance criterion against the actual code, a real `npx playwright test` run (normal and
mutation-enabled), and this summary. That is what this cycle did.

I re-read the plan, requirements (AC-1..AC-12) and exploration doc in full, then re-read every
changed/new file myself (not trusting the prior spot-check) and cross-checked each one against
the plan's §5 test-case matrix, §6 code change list, §7 tagging plan and §9 reliability notes.
**No code defects or gaps were found** — the existing implementation already satisfies every
acceptance criterion. I made no code changes. All effort this cycle went into verification: gates
+ real test runs (normal and mutation-enabled) + this summary.

## Code change list (as found, verified against the plan)

| File | Action | What it does | Plan item |
|---|---|---|---|
| `config/env.ts` | Modified | Adds `SAUCEDEMO_BASE_URL: z.string().url()` to `envSchema` | §6 row 1 |
| `.env.example` | Modified | Adds `SAUCEDEMO_BASE_URL=https://www.saucedemo.com` with a comment, grouped near `BASE_URL`/`API_BASE_URL` | §6 row 2 |
| `data/saucedemo/saucedemo-credentials.data.ts` | New | `SAUCEDEMO_USERS` (`standardUser`/`lockedOutUser`, literal public demo values) + `buildWrongPassword()` (Faker-backed, regenerates on the astronomically unlikely chance it equals the real password) | §6 row 3 |
| `data/saucedemo/saucedemo-product.data.ts` | New | `SAUCEDEMO_BACKPACK` (`name`, `addToCartTestId`) — the one product S-4 uses | §6 row 4 |
| `pages/saucedemo/login.page.ts` | New | `SaucedemoLoginPage`: `usernameInput`/`passwordInput`/`loginButton`/`errorMessage` locators; `open()` (goto via `joinUrl(env.SAUCEDEMO_BASE_URL)`); `login()`; `submitAndWaitForInventoryAsset()` (races the click against the product-image `GET .../assets/*.jpg` response) | §6 row 5 |
| `pages/saucedemo/inventory.page.ts` | New | `SaucedemoInventoryPage`: `pageTitle`/`cartLink`/`cartBadge`/`backpackAddToCartButton` locators; `addBackpackToCart()`, `openCart()` | §6 row 6 |
| `pages/saucedemo/cart.page.ts` | New | `SaucedemoCartPage`: `pageTitle`/`cartBadge`/`backpackItemName` locators | §6 row 7 |
| `tests/ui/saucedemo/saucedemo-login.spec.ts` | New | S-1/S-2/S-3 — exact titles/tags | §6 row 8 |
| `tests/ui/saucedemo/saucedemo-cart.spec.ts` | New | S-4 — exact title/tags | §6 row 9 |
| `README.md` | Modified | `SAUCEDEMO_BASE_URL` row in env-var table; "Notes" line documenting the add-to-cart network gap | §6 row 10 |
| `Jenkinsfile` | Modified | `SAUCEDEMO_BASE_URL` as a plain env var (not a credential) | §6 row 11 |
| `to_be_automated.md` | Modified (pre-existing) | Already read "No scenarios are queued right now" before this cycle — nothing to change | §6 row 12 |
| `fixtures/index.ts` | Modified (pre-existing, before this cycle) | Removes the old `sauceDemoAuthenticatedPage` worker/test fixture and its imports from the deleted `pages/saucedemo/login.page.ts`'s prior shape and `data/saucedemo/saucedemo-users.data.ts`. The new implementation doesn't need a shared authenticated-page fixture — each spec builds its own page objects (`SaucedemoLoginPage`/`SaucedemoInventoryPage`/`SaucedemoCartPage`) directly, matching the plan's structure diagram (§4). Not in the plan's §6 table, but required so the tree compiles after the old files were deleted; no behavior this plan needs is missing. |
| `data/saucedemo/saucedemo-users.data.ts`, `tests/ui/saucedemo/{login,cart}.spec.ts`, `utils/network.ts` | Deleted (before this cycle, per task setup) | The old implementation this plan replaces | n/a — out of scope, superseded |
| `.gitignore` | Modified (pre-existing) | Adds `.playwright-cli/` (CLI session output, may contain credentials) | Matches `ui-automation-workflow.md`'s secrets rule; not explicitly in plan §6 but a correct, low-risk addition |

### Verified against each acceptance criterion

- **AC-1 / AC-3 / AC-4**: `saucedemo-login.spec.ts` covers valid login → `/inventory.html` with
  `Products` title visible; `locked_out_user` → error shown, URL unchanged; `standard_user` +
  wrong password → error shown, URL unchanged. Confirmed by re-reading the spec and by the live
  test run (below).
- **AC-2 / AC-7**: S-1 asserts `response.status() === 200`, `method() === 'GET'`,
  `url()` matches `/\/assets\/.*\.(jpg)$/i`, captured via `Promise.all` racing the login click
  inside `submitAndWaitForInventoryAsset` — not a post-hoc check. S-4 reuses the same signal from
  its own login step, since exploration (E-6) conclusively found add-to-cart itself produces zero
  network requests on this site; this is flagged as a documented, SDET-facing open point in the
  plan (§11) and in `README.md`'s Notes section, not silently hidden.
- **AC-5**: the two error strings are asserted with `toHaveText(...)` using the exact live-copy
  text from the exploration doc (`"Epic sadface: Sorry, this user has been locked out."` vs.
  `"Epic sadface: Username and password do not match any user in this service"`) — distinct
  strings, distinct tests.
- **AC-6**: S-4 asserts `cartPage.backpackItemName` has count 1 and text `"Sauce Labs Backpack"`,
  and `cartPage.cartBadge` has text `"1"`.
- **AC-8**: all four tests call `applyUiMutation` on an element central to their own primary
  assertion (S-1 → inventory title `hide`; S-2/S-3 → login error message `hide`; S-4 → cart item
  name `replace-text`). Confirmed live as a genuine, non-no-op mutation (see test run below): all
  four fail under `MUTATION_ENABLED=true`, all four pass when unset/`false`.
- **AC-9**: exact tag arrays verified line-by-line against the requirements table (see "Tags"
  below); `grep` confirmed none of the four unique tags (`@login-valid-credentials`,
  `@login-locked-out-user`, `@login-invalid-password`, `@cart-add-product`) appears anywhere else
  in `tests/`.
- **AC-10**: `SAUCEDEMO_BASE_URL` is in `envSchema` (`z.string().url()`) and `.env.example`;
  `SaucedemoLoginPage.open()` uses `joinUrl(env.SAUCEDEMO_BASE_URL)` (no raw concatenation); the
  shared `BASE_URL` is untouched.
  `.env` (local, gitignored) already has `SAUCEDEMO_BASE_URL=https://www.saucedemo.com`.
- **AC-11**: confirmed live — all four tests pass on all four of the repo's existing UI projects
  (`chromium`, `firefox`, `webkit`, `new_webkit`; see `playwright.config.ts`'s `testMatch`-based
  project list, not an explicit per-site list) in the normal, `MUTATION_ENABLED` unset/false
  configuration.
- **AC-12**: `tsc --noEmit`, `eslint`, `prettier --check` all clean on changed/added files (below).

### Tags verified against the requirements table (exact match)

| Test | Tags found in code | Matches requirement |
|---|---|---|
| `logs in with valid credentials and lands on the inventory page` | `@p0`, `@smoke`, `@network-validation`, `@mutation-target`, `@login-valid-credentials` | Yes |
| `shows an error and stays on the login page for locked_out_user` | `@p1`, `@regression`, `@mutation-target`, `@login-locked-out-user` | Yes |
| `shows an error and stays on the login page for standard_user` | `@p1`, `@regression`, `@mutation-target`, `@login-invalid-password` | Yes |
| `adds a product to the cart and shows it on the cart page` | `@p1`, `@smoke`, `@network-validation`, `@mutation-target`, `@cart-add-product` | Yes |

All four use the Playwright `tag` test option (array literal in the `test(...)` call), never
inline `@tag` text in the title.

## Verification results

**Static checks** (ran directly via `node node_modules/<pkg>/bin/...` — this checkout's
`node_modules/.bin/tsc` is a plain file, not a symlink, so bare `npx tsc` fails with
`Cannot find module '../lib/tsc.js'`, a known environment issue per
`.ai/context/automation-pipeline-learnings.md`, not a code defect):

```
node node_modules/typescript/bin/tsc --noEmit
→ no output, exit 0

node node_modules/eslint/bin/eslint.js config/env.ts data/saucedemo/*.ts pages/saucedemo/*.ts \
  tests/ui/saucedemo/*.spec.ts
→ no output, exit 0 (confirmed 0 messages via --format json)

node node_modules/prettier/bin/prettier.cjs --check config/env.ts data/saucedemo/*.ts \
  pages/saucedemo/*.ts tests/ui/saucedemo/*.spec.ts README.md
→ "All matched files use Prettier code style!"
```

`.env.example` and `Jenkinsfile` were also checked: `prettier --check` on those two file names
directly errors with "No parser could be inferred" (dotenv/Groovy have no Prettier plugin
installed in this repo) — but this is Prettier's normal behavior when a file is named explicitly
without a parser; the real gate, `npm run format:check` → `prettier --check .`, silently skips
unparseable files when given a directory and passed with no issues
(`node node_modules/prettier/bin/prettier.cjs --check .` → "All matched files use Prettier code
style!"). Not a defect.

**Test runs** (sandbox override used from the start for every run below, never sandboxed-first):

1. `CI=1 MUTATION_ENABLED=false npx playwright test --grep "@login-valid-credentials|@login-locked-out-user|@login-invalid-password|@cart-add-product"`
   (all 4 UI projects: chromium, firefox, webkit, new_webkit)
   → **22 passed** (4 tests × 4 projects + `setup_chromium`/`teardown_chromium`/`setup_firefox`/`teardown_firefox`/`setup_webkit`/`teardown_webkit` — `webkit`/`new_webkit` share one `setup_webkit`/`teardown_webkit` pair), 16.3s, 2 workers.

2. `MUTATION_ENABLED=true npx playwright test --grep "@login-valid-credentials|@login-locked-out-user|@login-invalid-password|@cart-add-product" --project=chromium`
   → **4 failed** (all 4, and only the 4, target tests), each on its own targeted assertion:
   - `@login-valid-credentials`: `expect(inventoryPage.pageTitle).toBeVisible()` → "Received: hidden" (title mutated `hide`)
   - `@login-locked-out-user` / `@login-invalid-password`: same pattern on `loginPage.errorMessage` (hidden)
   - `@cart-add-product`: `expect(cartPage.backpackItemName).toHaveText('Sauce Labs Backpack')` → "Received: 'Mutated content'" (`replace-text` mutation)

   This confirms AC-8's mutation wiring is live, not a no-op: each test fails specifically on the
   assertion guarding the element that was mutated, not on an unrelated step.

3. `env -u MUTATION_ENABLED CI=1 npx playwright test --grep "@login-valid-credentials|@login-locked-out-user|@login-invalid-password|@cart-add-product" --project=chromium`
   (mutation var fully unset, not just `false`, to rule out any leftover state from run 2)
   → **6 passed** (4 tests + setup/teardown), 4.5s. Confirms the suite is genuinely green again in
   the default configuration after the mutation run.

## Deviations from the plan

None introduced this cycle — no code was changed. Deviations already present in the
pre-existing implementation, carried forward as documented (not newly introduced, and already
flagged in the plan/exploration):

- **S-4's `@network-validation` signal is the login precondition's product-image GET, not the
  add-to-cart click itself** — exploration (E-6) found add-to-cart produces zero network requests
  on this site; the plan's §11 explicitly calls this an open point for SDET sign-off, and
  `README.md`'s Notes section documents it. Not a gap introduced by this cycle.
- **`fixtures/index.ts`'s old `sauceDemoAuthenticatedPage` fixture was removed** (not in the
  plan's §6 table, but necessary cleanup since it depended on the deleted old
  `data/saucedemo/saucedemo-users.data.ts` and the old page-object shape). The new tests don't use
  a shared authenticated-page fixture; each spec builds its own page objects directly, which
  matches the plan's structure diagram (§4) and introduces no missing coverage.

## Known issues / follow-ups (not fixed, out of this plan's scope)

- `filetree.txt` and `architecture.svg` are stale relative to the current repo tree: neither
  mentions `pages/saucedemo/`, `data/saucedemo/`, or `tests/ui/saucedemo/`, which exist and are
  covered by this plan. Both were already out of sync with several other, unrelated parts of the
  repo before this task (e.g. `filetree.txt` is missing `docs/exploration/`, `docs/requirements/`,
  and multiple existing report files that predate this run), and neither file is listed in the
  plan's §6 code change list or referenced by any skill/agent as an authoritative source — so this
  is a pre-existing documentation-staleness issue, not a defect introduced here. Flagging for the
  SDET rather than silently fixing only the SauceDemo-related lines, since a partial fix would
  leave the files inconsistent in a different way.
- README.md's "Running tests" section example commands (`npx playwright test tests/ui/saucedemo`,
  `npx playwright test --grep @network-validation`) were present in a prior committed version of
  the file but are not in the current working copy; the plan's §6 only requires an env-var table
  row and a Notes line (both present and verified), so this was left as-is rather than treated as
  a defect. An SDET may want those example commands restored for discoverability — noted, not
  blocking.

## Recommended next step

`review-code-changes docs/reports/saucedemo-login-cart-implementation-summary.md`
