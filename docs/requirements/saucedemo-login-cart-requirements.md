# SauceDemo Login & Add-to-Cart — Automation Requirements

Source: SDET requirement (verbatim):

> add/restore Playwright + TypeScript UI automation test cases against https://www.saucedemo.com/ for login and
> add-to-cart behavior.
>
> Note on repo state: the previous saucedemo page objects, specs, data builder and a network util
> (`pages/saucedemo/*.page.ts`, `tests/ui/saucedemo/*.spec.ts`, `data/saucedemo/saucedemo-users.data.ts`,
> `utils/network.ts`) were deleted in the working tree (uncommitted) before this run, and `to_be_automated.md`
> was cleared of its saucedemo entry. Treat this as a fresh ground-up implementation against the current live
> site via `playwright-cli` exploration — do not assume the deleted files' old locators, structure, or content
> are still valid or should be restored as-is; run the full pipeline (analyze-task → plan → implement → review
> cycles) from scratch per repo rules.
>
> Required test cases (exact scenario, and exact tags to apply via the Playwright `tag` test option — not inline
> title text):
>
> | Test case (title text) | Tags |
> |---|---|
> | logs in with valid credentials and lands on the inventory page | `@p0`, `@smoke`, `@network-validation`, `@mutation-target`, `@login-valid-credentials` |
> | shows an error and stays on the login page for locked_out_user | `@p1`, `@regression`, `@mutation-target`, `@login-locked-out-user` |
> | shows an error and stays on the login page for standard_user | `@p1`, `@regression`, `@mutation-target`, `@login-invalid-password` |
> | adds a product to the cart and shows it on the cart page | `@p1`, `@smoke`, `@network-validation`, `@mutation-target`, `@cart-add-product` |
>
> Clarifications for scenarios implied but not spelled out above:
> - The third test case ("...for standard_user") is an invalid password scenario for the `standard_user` account
>   (that's what the `@login-invalid-password` tag names), not a locked-out scenario — use `standard_user`'s known
>   username with a deliberately wrong password, and assert the SauceDemo error message/stays-on-login behavior.
> - The `@network-validation` tag on test 1 and test 4 means those two tests should also validate the relevant
>   network request(s) involved (e.g. intercept/assert on the request the login form or add-to-cart action
>   triggers), not just UI state — confirm via `playwright-cli`'s `requests`/`route` exploration what's actually
>   observable on this site before committing to a specific assertion shape (this is for the PLANNING stage).
> - The `@mutation-target` tag on all four means they should be written to work with this repo's existing opt-in
>   UI mutation-testing mechanism (`utils/mutation-testing.ts` → `applyUiMutation(target, 'hide' | 'replace-text')`,
>   a no-op unless `MUTATION_ENABLED` is true; `playwright.config.ts` filters to `@mutation-target` tests when that
>   flag is on). Don't invent a new mechanism — require that each of these four tests calls `applyUiMutation` on an
>   appropriate element.

Date: 2026-11-05 · Status: Draft for review (cycle 1)

## 1. Objective

The repository has no working SauceDemo UI coverage right now: the previous login/cart page objects, specs, data
builder and a network helper were deleted from the working tree (uncommitted), and `to_be_automated.md` no longer
lists this work. The SDET wants this coverage added back, built fresh against the live site rather than restored
from the deleted files, covering one successful login, two failed-login scenarios, and one add-to-cart flow. Two
of the four tests must also validate the network activity those actions trigger, and all four must be written to
cooperate with the repo's existing opt-in UI mutation-testing mechanism. Success means these four scenarios are
automated, tagged exactly as specified, pass against the live site, and each one can be shown to fail when its
mutation is turned on.

## 2. Scope

**In scope**
- Exactly the four test cases in the table above, with the exact title text and exact tags shown (as the
  Playwright `tag` test option, not inline title text, per `.ai/context/test-tagging.md`).
- Login with valid credentials (`standard_user` / its documented password) reaching the inventory/products
  listing page.
- Login with the `locked_out_user` account, which must show an error and keep the user on the login page.
- Login with `standard_user`'s username and a deliberately wrong password, which must show an error and keep the
  user on the login page.
- Adding one product to the cart from the inventory page and confirming it appears on the cart page.
- For the valid-login test and the add-to-cart test: also validating whatever network activity those two actions
  actually produce on the live site (exact assertion shape to be confirmed during planning's live exploration —
  see §10/§11).
- For all four tests: invoking the existing `applyUiMutation` mechanism on an element whose mutation would make
  that specific test fail, so each test is a genuine mutation target (no-op when `MUTATION_ENABLED` is false).
- Adding the dedicated `SAUCEDEMO_BASE_URL` environment variable (`config/env.ts` + `.env.example`) per the repo's
  one-env-var-per-target-site rule, since `env.ts` currently only defines `BASE_URL`/`API_BASE_URL`.
- Headless `playwright-cli` exploration of the live site (login page, locked-out state, invalid-password state,
  inventory page, cart page, and the network traffic those pages/actions produce) before any code is written, per
  `.ai/context/ui-automation-workflow.md`.

**Out of scope / exclusions**
- Any SauceDemo flow other than the four listed (e.g. checkout, removing items, sorting/filtering, other user
  accounts such as `problem_user` or `performance_glitch_user`, logout).
- Restoring the deleted files' old locators, page-object structure, data builder shape or network util as-is —
  this is fresh analysis/implementation against the current live site.
- Designing or changing the mutation-testing mechanism itself (`utils/mutation-testing.ts`,
  `playwright.config.ts`'s `@mutation-target` filtering) — only using the existing mechanism as specified.
- Browsers other than the three already configured UI projects (`chromium`, `firefox`, `webkit`); no new browser
  project is being requested.
- Any other site/feature coverage, and any change to `BASE_URL`/`API_BASE_URL` or other sites' tests.

**Existing coverage**: none currently — the prior SauceDemo specs, page objects and data builder are deleted from
the working tree (uncommitted) and are not being restored as-is.

## 3. Target & environment

- Application under test: `https://www.saucedemo.com/` (public demo e-commerce site), via a new
  `SAUCEDEMO_BASE_URL` environment variable.
- Exploration and development browser profile: Desktop Chrome only (per repo rule; the SDET checks other browsers
  separately). Automated tests themselves run under the framework's existing UI projects
  (`chromium`/`firefox`/`webkit`) unless scope is narrowed by a later decision (see Q-3).
- Environment: no login/auth backend beyond the site's own public demo accounts; no API base URL or `api` project
  involvement.

## 4. Preconditions

- The site's publicly documented demo accounts are available and unchanged: `standard_user` (normal login) and
  `locked_out_user` (blocked at login), sharing a publicly documented password. These are public demo credentials,
  not secrets.
- `MUTATION_ENABLED` defaults to `false` for normal runs; the repo's existing config already forbids
  `MUTATION_ENABLED=true` together with `CI` (see `.ai/context/automation-pipeline-learnings.md`), so these tests
  must behave correctly (pass) in that default state and must be able to fail when mutation is deliberately
  enabled locally.
- The inventory page lists at least one purchasable product that can be added to the cart.

## 5. Scenarios

**S-1 Valid login reaches the inventory page** *(tags: `@p0`, `@smoke`, `@network-validation`, `@mutation-target`,
`@login-valid-credentials`)*
Goal: a user with valid credentials can log in and lands on the inventory/products page.
Steps: open the login page; enter `standard_user`'s username and correct password; submit.
Expected: the browser navigates to the inventory/products listing page and that page's content is visible (no
error is shown). The network request(s) the login action triggers are also validated (exact signal confirmed
during planning exploration).

**S-2 Locked-out user is blocked at login** *(tags: `@p1`, `@regression`, `@mutation-target`,
`@login-locked-out-user`)*
Goal: the site blocks a known locked-out account and tells the user why.
Steps: open the login page; enter `locked_out_user`'s username and its correct password; submit.
Expected: an error message is displayed (exact wording confirmed live during planning exploration, since it is
site copy, not something to guess here) and the user remains on the login page — no navigation to the inventory
page occurs.

**S-3 Invalid password is rejected for standard_user** *(tags: `@p1`, `@regression`, `@mutation-target`,
`@login-invalid-password`)*
Goal: the site rejects a known-valid username with an incorrect password.
Steps: open the login page; enter `standard_user`'s username and a deliberately wrong password; submit.
Expected: an error message is displayed (exact wording confirmed live during planning exploration) and the user
remains on the login page — no navigation to the inventory page occurs. This is distinct from S-2: the account
itself is not locked, only the password is wrong.

**S-4 Adding a product shows it on the cart page** *(tags: `@p1`, `@smoke`, `@network-validation`,
`@mutation-target`, `@cart-add-product`)*
Goal: a logged-in user can add a product from the inventory page and see it reflected in the cart.
Steps: log in with valid credentials; from the inventory page, add one product to the cart; open the cart page.
Expected: the added product appears on the cart page (e.g. by name/identity), and any cart-related UI indicator
(such as a cart item count) reflects one item added. Any network activity the add-to-cart action actually
produces is also validated (exact signal confirmed during planning exploration — see §10/§11, since it is not
yet known whether this action produces a distinct, assertable network request on this site).

## 6. Acceptance criteria

| AC | Criterion (pass/fail) | Scenario |
|---|---|---|
| AC-1 | Given valid `standard_user` credentials submitted on the login page, the browser reaches the inventory/products listing page and that page's product content is visible. | S-1 |
| AC-2 | The valid-login test additionally observes and asserts on the network activity the login submission produces (request occurrence and/or method/URL/status/response shape, as confirmed observable during planning exploration). | S-1 |
| AC-3 | Given `locked_out_user`'s credentials submitted on the login page, an error message is displayed, and the browser remains on the login page (no navigation to the inventory page). | S-2 |
| AC-4 | Given `standard_user`'s username with an incorrect password submitted on the login page, an error message is displayed, and the browser remains on the login page (no navigation to the inventory page). | S-3 |
| AC-5 | The error shown in AC-3 and the error shown in AC-4 are each asserted against the actual text the live site displays for that specific case (confirmed via exploration, not guessed), and the two are treated as distinct scenarios even if their wording overlaps. | S-2, S-3 |
| AC-6 | Given a logged-in user who adds one product to the cart from the inventory page, that product then appears on the cart page, and any cart-count indicator reflects one item added. | S-4 |
| AC-7 | The add-to-cart test additionally observes and asserts on whatever network activity the add-to-cart action actually produces, per the planning exploration's findings (see Q-2/A-2 if none exists). | S-4 |
| AC-8 | Each of the four tests calls the existing `applyUiMutation` helper on an element whose mutation (`hide` or `replace-text`) would cause that specific test to fail, so that running the suite with `MUTATION_ENABLED=true` turns each test's outcome to failing, while running with it unset/`false` leaves all four passing. | S-1, S-2, S-3, S-4 |
| AC-9 | Each test carries exactly the tags listed in the requirement's table (as the Playwright `tag` option, not inline title text), including its unique scenario tag (`@login-valid-credentials`, `@login-locked-out-user`, `@login-invalid-password`, `@cart-add-product`), none of which is reused elsewhere in the repo. | — |
| AC-10 | A dedicated `SAUCEDEMO_BASE_URL` environment variable exists in `config/env.ts` (Zod-validated) and is documented in `.env.example`; no test repoints the shared `BASE_URL`. | — |
| AC-11 | All four tests pass against the live site on the framework's existing UI project(s) in the normal (`MUTATION_ENABLED` unset/`false`) configuration. | S-1, S-2, S-3, S-4 |
| AC-12 | Repo quality gates pass on all changed/added files: `npx tsc --noEmit`, `npx eslint <files>`, `npx prettier --check <files>`. | — |

## 7. Test data

- `standard_user` and `locked_out_user` usernames, and their shared documented password, are the live site's own
  public demo credentials — not secrets. No `.env` entry is required for them (they are not environment-specific),
  but how they are represented in code (literal, data builder, fixture) is an implementation decision for
  planning, not a requirement here.
- The deliberately wrong password for the invalid-password scenario (S-3) is any value that is not the account's
  real password; no specific value is mandated.
- The product added to the cart (S-4) is any single product available on the inventory page; no specific product
  is mandated unless planning's exploration finds a reason to pick one (e.g. one with a stable, unique name).
- No secrets and no production data are involved.

## 8. Classification

- Test 1: `@p0`, `@smoke`, `@network-validation`, `@mutation-target`, `@login-valid-credentials`.
- Test 2: `@p1`, `@regression`, `@mutation-target`, `@login-locked-out-user`.
- Test 3: `@p1`, `@regression`, `@mutation-target`, `@login-invalid-password`.
- Test 4: `@p1`, `@smoke`, `@network-validation`, `@mutation-target`, `@cart-add-product`.
- All four tags sets above are exact requirements, not suggestions; each unique scenario tag must not be reused
  anywhere else in the repo (`.ai/context/test-tagging.md`).

## 9. Non-functional

- Reliability: no hard waits (`waitForTimeout`) in satisfying any AC; use auto-waiting/web-first assertions per
  repo convention. If the live site has a known slow-to-settle state for any of these flows, planning must account
  for it explicitly (as previously documented for a different SauceDemo user in
  `.ai/context/automation-pipeline-learnings.md`), rather than relying on a bare URL check.
- No visual, accessibility or performance requirement was stated for this task.

## 10. Dependencies & risks

- **R-1 Third-party site drift**: `www.saucedemo.com` is an external demo site outside this repo's control. Its
  copy, markup or behavior can change independently of this work.
- **R-2 Network-validation shape unknown until explored**: the requirement names `@network-validation` for tests 1
  and 4 but defers the exact assertion shape to planning's live `playwright-cli` exploration (`requests`/`route`),
  per the task's own instruction. This doc intentionally does not prescribe a shape.
- **R-3 Add-to-cart may be purely client-side**: it is not yet known whether adding a product to the cart produces
  any distinct, assertable network request on this site, as opposed to a client-side-only state change. See
  Q-2/A-2.
- **R-4 Nothing to restore**: the previous SauceDemo page objects, specs, data builder and network util are
  deleted from the working tree (uncommitted); this work is fresh implementation, not a restore, and must not
  assume the deleted files' structure or locators are still valid.
- **R-5 Mutation mechanism is pre-existing and fixed**: `utils/mutation-testing.ts`'s `applyUiMutation` and the
  config's `@mutation-target` filtering already exist and must be used as-is, not redesigned.
- **R-6 Sandbox**: any `npx playwright test` run to verify these tests must use the sandbox override, not the
  default command sandbox (`.ai/context/automation-pipeline-learnings.md`).

## 11. Open questions / assumptions

None of these is blocking; each has a stated default that this doc assumes pending SDET confirmation.

- **Q-1 / A-1 (error message wording)**: the exact text of the locked-out and invalid-password error messages is
  not specified in the task and is treated as site copy to be confirmed live during planning exploration, not
  guessed here. Default: assert on whatever text the live site actually shows at planning time (AC-5).
- **Q-2 / A-2 (add-to-cart network signal)**: it is unknown whether adding a product to the cart produces a
  distinct network request. Default: planning's exploration determines this; if no distinct, assertable network
  activity exists for this action, the network-validation requirement for test 4 is satisfied by asserting on
  whatever network activity genuinely does occur around that action (if any), and if truly none exists at all,
  that gap is reported back rather than invented.
- **Q-3 / A-3 (which UI projects run these tests)**: the task doesn't say whether these four tests should run on
  all three existing UI projects (`chromium`/`firefox`/`webkit`) or Chrome only. Default: follow the existing
  framework default of running on all configured UI projects, consistent with how other UI specs in this repo
  behave; Desktop Chrome is only mandated for the exploration step, not as a scope limit on which projects execute
  the tests.
- **Q-4 / A-4 (which element each test mutates)**: the task requires that each test call `applyUiMutation` on "an
  appropriate element" but doesn't name one. Default: left to planning, provided the chosen element's mutation
  would make that specific test fail (AC-8).
- **Q-5 / A-5 (credential representation)**: whether the demo usernames/password are inlined, built via a data
  builder, or placed in a fixture is an implementation decision for planning (principle a/b), since they are
  public, non-secret, non-environment-specific values that don't need an `.env` entry.

## 12. Definition of done

- AC-1 through AC-12 are met.
- All four tests pass against the live site in the normal (`MUTATION_ENABLED` unset/`false`) configuration, and
  each one's targeted mutation demonstrably turns it to failing when `MUTATION_ENABLED=true` is set locally.
- `SAUCEDEMO_BASE_URL` is added to `config/env.ts` and documented in `.env.example`, following the existing
  per-site env-var convention.
- `.ai/context/` rules are followed: headless `playwright-cli` exploration (Desktop Chrome profile) happens before
  any UI automation code is written, with evidence saved to
  `docs/exploration/saucedemo-login-cart-exploration.md`; every test run uses the sandbox override; every test
  carries the exact tags specified (classification + unique scenario tag, via the `tag` option).
- `tsc --noEmit`, ESLint and `prettier --check` are clean on changed/added files.
- The change passes code review (all scores ≥ 4) in the orchestration pipeline.
