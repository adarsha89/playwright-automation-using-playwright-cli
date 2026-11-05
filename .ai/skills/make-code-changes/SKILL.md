---
name: make-code-changes
description: Implement a Playwright + TypeScript automation code change plan from a markdown file (e.g. docs/plans/<feature-slug>-plan.md). Makes every planned change following repo conventions, fixes any TypeScript/ESLint/Prettier issues without changing the plan's intent, runs the new tests, and writes an implementation summary md that review-code-changes can consume.
argument-hint: "<path to plan md>"
---

# make-code-changes

Input: path to a plan md (`$ARGUMENTS`). If none is given, list `docs/plans/*.md` and ask which one.

Before starting, read:
- Every file in `.ai/context/` (start with `ai-assistant-instructions.md`) (rules override everything here)
- The plan in full, plus everything it links to (requirements, `docs/exploration/*` files)
- Every file the plan says to modify, and the neighbouring code you will mirror
  (`fixtures/index.ts`, `pages/base.page.ts`, an existing page object/spec/data file of the same kind)
- `.ai/skills/playwright-cli/SKILL.md` — for checking locators and diagnosing failures

## Step 1 — Preconditions

- **UI exploration gate:** for any UI locator the plan introduces, a matching
  `docs/exploration/<feature-slug>-exploration.md` must exist and contain evidence for it. If it
  doesn't, stop and report that planning must explore it first with `playwright-cli` in headless mode
  (see `.ai/context/ui-automation-workflow.md`). Never invent a locator or use `npx playwright codegen`.
- Record baseline: `npx tsc --noEmit`, `npx eslint .`, `npx playwright test --list | tail -1`,
  so pre-existing issues aren't attributed to this change.
- If the plan is ambiguous or contradicts a rule in `.ai/context/`, ask — don't silently pick.

## Step 2 — Implement

Implement exactly what the plan lists, in dependency order: `config/env.ts` + `.env.example` →
data/builders → API clients/helpers → page objects/components → fixtures → specs → docs/README.

Conventions (match surrounding code — naming, comment density, JSDoc style):
- Specs import `{ test, expect }` from `fixtures/`; no raw `process.env`; no locators in specs.
- Page objects extend `BasePage`, expose `readonly` `Locator` fields assigned in the constructor,
  and action methods returning `Promise<void>`; include the JSDoc pointer to the exploration file.
- Locators: role/label/`data-test(id)` first; `getByRole('heading', …)` always scoped with `level`.
- URLs: join base + path with an explicit separator / normalised slash — never raw concatenation.
- Every `test()` has `{ tag: ['@<classification>', '@<unique-scenario>'] }`; parametrized tests
  take their unique tag from the data row. No inline `@tag` in titles.
- Web-first assertions (`await expect(locator).toBeVisible()`), no `waitForTimeout`, no `test.only`.
- Synthetic data via builders/Faker; no secrets or real PII in code.
- If an existing test's behaviour changes, update its tags accordingly.
- Browser agnostic: no `browserName` branches or skips, no project-name or user-agent checks, no
  Chromium-only APIs (CDP sessions, `page.coverage`) and no engine-specific selectors.

## Step 3 — Static checks and fix loop

Run on changed files (and the whole project for `tsc`):
```bash
npx tsc --noEmit
npx eslint <changed files>
npx prettier --check <changed files>   # fix with: npx prettier --write <changed files>
```
Fix every error/warning **introduced by this change** without altering the plan's intent
(don't delete assertions, loosen types to `any`, add `eslint-disable`, or skip tests to get green).
If a fix would require changing intent, stop and report it. Repeat until clean. Report — don't
"fix" — pre-existing repo-wide issues outside the changed files.

## Step 4 — Run the tests

Run the new/changed tests by tag, **with the sandbox override from the start** (never sandboxed first):
```bash
npx playwright test --grep "@<unique-tag>|@<unique-tag-2>" --project=chromium   # API tests: --project=api
```
Run UI tests on the `chromium` project (`...devices['Desktop Chrome']`) only; the SDET checks other browsers.
then the plan's full verification commands. If a test fails, diagnose from the error, trace and
screenshot, then reproduce it live: run the test with `CI=1 ... --debug=cli`, attach `playwright-cli`, step to
the failure, and inspect `snapshot`, `console` and `requests` (see `.ai/context/ui-automation-workflow.md`).
Rehearse a corrected interaction there before editing the code. A locator or step the plan doesn't
cover is a deviation to record in the summary, not a silent addition. Fix genuine code defects; for app/environment issues (see known gaps in `.ai/context/automation-pipeline-learnings.md`)
report them — don't mask them.

## Step 5 — Write the implementation summary

Write `docs/reports/<feature-slug>-implementation-summary.md` (the input for `review-code-changes`):

1. Link to the plan, requirements and exploration files.
2. **Code change list** — table: `File | Added/Modified/Deleted | What changed | Plan item`.
3. Key excerpts for non-trivial changes (new page objects, fixtures, parametrization).
4. Tests added/modified — title, tags, project(s).
5. Verification results — exact commands and outcomes for tsc, eslint, prettier, and test runs (pass/fail/skip counts).
6. Deviations from the plan and why; issues fixed during the lint/type loop.
7. Known issues / follow-ups.

Finish by pointing the user at the summary and suggesting
`review-code-changes docs/reports/<feature-slug>-implementation-summary.md`.
Do not commit unless the user asks.
