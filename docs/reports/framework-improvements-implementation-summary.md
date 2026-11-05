# Framework improvements — implementation summary

Date: 2026-09-29 · Scope: align existing framework with principles a–j and the rules in `.ai/context/`.
Input for: `review-code-changes docs/reports/framework-improvements-implementation-summary.md`.
No plan md — the user requested the improvements directly; the findings below served as the plan.

## Baseline (before changes)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm run lint` | **fail** — 2 errors, 1 warning in `tests/seed.spec.ts` |
| `npx prettier --check .` | **fail** — 19 files |
| `npx playwright test --list` | 17 tests in 4 files |
| Jenkins | would fail: image `v1.48.0` vs installed `1.62.1`; `SHARD_INDEX`/`SHARD_TOTAL` undefined; 5 of 7 env vars required by `config/env.ts` not provided; headed browser on a display-less agent |

## Code change list

| File | Change | What changed | Principle / rule |
|---|---|---|---|
| `utils/url.ts` | added | `joinUrl(base, path = '')` — single `/` between base and path; no path → base with one trailing slash | e; rule "no raw base-URL concatenation" |
| `fixtures/index.ts` | modified | `authenticatedPage` and `sauceDemoAuthenticatedPage` use `joinUrl` instead of template concatenation | e, c |
| `tests/ui/saucedemo/login.spec.ts` | modified | both `toHaveURL` checks use `joinUrl` (works with or without trailing slash in env) | e, c |
| `pages/saucedemo/cart.page.ts` | modified | new `cartItemNames` locator (composed from the existing, exploration-verified locators); `getCartItemNames` reuses it | e, b |
| `tests/ui/saucedemo/cart.spec.ts` | modified | non-retrying `expect(await …)` replaced with web-first `toHaveCount(0)` on the badge and `toHaveText([BACKPACK])` on cart item names (also asserts the exact list, not just membership) | g |
| `playwright.config.ts` | modified | `headless: !!process.env.CI` (was hard-coded `false`); `trace`: `on-first-retry` on CI / `retain-on-failure` locally (was `'on'` with the intended value commented out); `video: 'retain-on-failure'` (was `'on'`) | g, h, j |
| `Jenkinsfile` | modified | image `v1.62.1-noble` (verified to exist on MCR, matches lockfile); `SHARD_INDEX`/`SHARD_TOTAL` build parameters (default `1/1`); all 7 `config/env.ts` vars supplied (4 new secret-text credential IDs, `SAUCEDEMO_BASE_URL` literal); Prettier check stage; `junit allowEmptyResults` so a pre-test failure still archives artifacts | j, i, d |
| `package.json` | modified | `lint`: dropped legacy `--ext .ts` (no-op under flat config); added `format:check` | d, j |
| `eslint.config.mjs` | modified | ignore `tests/seed.spec.ts` (Playwright Test Agents scaffold, not in any project's `testMatch`), with explanatory comment | d, j |
| `README.md` | modified | new scripts, `utils/url.ts`, CI section with Jenkins credential table | h, j |
| 12 files (`config/env.ts`, `api/helpers/response-assertions.helper.ts`, specs, `.mcp.json`, `README.md`, `to_be_automated.md`, …) | modified | `prettier --write` only — no semantic changes | d |

No test titles, tags, locators (other than the composed `cartItemNames`) or assertions' intent were changed.
`InventoryPage.getCartBadgeCount` and `CartPage.hasProduct` are now unused by specs but kept as page API.

## Verification (after changes)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass (0 problems) |
| `npm run format:check` | pass |
| `npx playwright test --list` | 17 tests in 4 files (unchanged) |
| `npx playwright test --project=chromium` (local, headed, sandbox override) | 5/5 passed |
| `CI=1 SAUCEDEMO_BASE_URL=https://www.saucedemo.com npx playwright test --project=chromium --project=firefox --project=webkit` (headless, slash-less base URL) | 15/15 passed, 0 flaky |

API tests (`@api-fetch-user-by-id`, `@api-create-user`) not run: known environment gap (no `/auth/login` backend), see `.ai/context/automation-pipeline-learnings.md`.

## Follow-ups for the SDET

- Create Jenkins credentials `qa-test-user-email`, `qa-test-user-password`, `qa-api-auth-username`, `qa-api-auth-password` (plus existing `qa-base-url`, `qa-api-base-url`).
- Jenkins only registers the new `SHARD_*` parameters after the first run of the updated `Jenkinsfile`; defaults (`1/1`) apply until then.
- `.gitignore` ignores `/docs`, `.ai`, `AGENTS.md` and `CLAUDE.md` — so this report, the skills/agents and the context files are not versioned. Revisit if they should be shared.
