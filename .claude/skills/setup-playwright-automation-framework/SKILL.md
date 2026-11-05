---
name: setup-playwright-automation-framework
description: Set up, or extend/modify, the Playwright + TypeScript test automation framework in this repo (UI/E2E, API, component, visual, accessibility; native runner or Cucumber/playwright-bdd; browsers; CI platform). Asks scoping questions, writes a reviewable plan with diagrams, waits for approval, then implements without breaking existing tests and writes docs/setup-framework.md for code review.
argument-hint: "[optional: answers to the scoping questions, e.g. 'UI+API, native runner, chromium+webkit, Jenkins']"
---

# setup-playwright-automation-framework

Sets up (greenfield) or modifies (brownfield) a Playwright + TypeScript automation framework
using the Playwright CLI (`npx playwright ...`). This repo already has a framework — in that
case the job is to **extend it in place**, never to replace it.

Before starting, read:
- Every file in `.ai/context/` (start with `ai-assistant-instructions.md`) (repo rules and learnings — they override anything below)
- `README.md`, `package.json`, `package-lock.json`, `playwright.config.ts`, `tsconfig.json`,
  `eslint.config.mjs`, `config/env.ts`, `fixtures/index.ts`, the CI file (`Jenkinsfile` etc.)
- `docs/plans/framework-setup-plan.md` if it exists (previous setup decisions)

## Phase 1 — Gather inputs

If the user supplied answers up front (in the prompt or `$ARGUMENTS`), use them and only ask
for what's missing. Otherwise ask the questions **one at a time** (use your tool's structured-question UI
if available, allowing multiple selections for I and III). Never assume an answer.

| # | Question | Options |
|---|---|---|
| I | What should this framework cover? (multi-select) | a. UI / E2E browser testing · b. API testing (Playwright `request` fixture) · c. Component testing · d. Visual regression testing · e. Accessibility testing |
| II | Which authoring/execution style? | a. Native Playwright Test runner (`@playwright/test`) · b. Cucumber-JS (BDD) via `playwright-bdd` or a custom glue layer |
| III | Which browsers/platforms? (multi-select) | Chromium · Firefox · WebKit · Mobile emulation (e.g. Pixel 7, iPhone 14) |
| IV | Which CI/CD platform? | GitHub Actions · Jenkins · GitLab CI · Azure DevOps |

Follow-ups only when an answer makes them necessary (e.g. component testing → which UI
framework: React/Vue/Svelte; visual → where baselines are stored and which OS generates them;
accessibility → `@axe-core/playwright` and which WCAG tags; BDD → `playwright-bdd` vs custom).

Record the answers verbatim in the plan.

## Phase 2 — Inventory what exists (brownfield safety)

Before planning, produce a baseline:
1. List existing specs, page objects, fixtures, clients, config projects, env vars and CI stages.
2. Record installed versions from `package.json` **and** `package-lock.json` (`npx playwright --version`,
   `npx tsc --version`, `npx eslint --version`). Every version you pin later (Docker image tag,
   `moduleResolution`, ESLint config format, action versions) must match these — never copy an
   example value verbatim.
3. Capture the baseline health: `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check .`
   and `npx playwright test --list` (listing does not launch browsers). Note pre-existing
   failures so they are not blamed on the new change.

## Phase 3 — Write the plan and STOP for approval

Write `docs/plans/framework-setup-plan.md` (if one exists, add a new dated section rather than
overwriting history). It must contain:

1. **Inputs** — answers to I–IV and follow-ups.
2. **Current state** — inventory + baseline health from Phase 2.
3. **Target architecture** — folder tree (existing vs. new marked clearly).
4. **Diagrams (Mermaid)** — at minimum:
   - *Structure diagram*: layers (specs → fixtures → page objects / API clients / step defs → config/env, data builders, utils).
   - *Execution/workflow diagram*: `npx playwright test` → config/projects → fixtures setup → test → reporters/artifacts → CI stages.
   - *CI pipeline diagram*: install → cache browsers → lint/typecheck/prettier → sharded test → publish reports.
5. **Principle mapping** — a table showing how each of principles a–j is satisfied (file + mechanism).
6. **Change list** — every file to be created/modified, with purpose; new dependencies with the exact
   version range, and the CLI commands to be run (e.g. `npm init playwright@latest` flags — note `--gha`
   is presence-only; omit it for non-GitHub CI).
7. **Backward-compatibility guarantees** — how existing specs, fixtures, env vars, projects and CI keep
   working (e.g. new projects use separate `testMatch`; new env vars are additive; shared `BASE_URL`
   is not repointed).
8. **Risks & open questions.**

Then **stop and ask the user to review/approve** the plan. Do not change any framework file
before explicit approval. If the user requests changes, update the plan and ask again.

## Phase 4 — Implement (only after approval)

Implement exactly the approved plan, using the Playwright CLI where it applies
(`npm init playwright@latest`, `npx playwright install --with-deps`, etc.). Conventions:

- **Architecture**: page objects extend `pages/base.page.ts`; locators only in page objects/components;
  API clients extend `api/clients/base.client.ts`; all custom fixtures in `fixtures/index.ts` via `test.extend`;
  specs import `{ test, expect }` from `fixtures/`.
- **Config**: every env var goes through `config/env.ts` (Zod) and is documented in `.env.example`;
  nothing else reads `process.env` except `playwright.config.ts` for `CI`.
- **Projects**: one project per browser/device; each capability gets its own `testMatch`
  (e.g. `api/**`, `a11y/**`, `visual/**`, `component/**`) so existing projects are unaffected.
- **Visual**: `toHaveScreenshot` with explicit `maxDiffPixelRatio`, masked dynamic regions, baselines
  generated on the CI OS (Docker) only.
- **Accessibility**: `@axe-core/playwright` wrapped in a fixture/helper, with explicit WCAG tags.
- **BDD**: `playwright-bdd` `defineBddConfig`, features under `features/`, step defs reuse the same page objects/fixtures.
- **Reliability**: no `waitForTimeout`; web-first assertions; retries on CI only; `forbidOnly` on CI.
- **Reporting**: HTML + JUnit (and Allure if requested); trace/video/screenshot retained on failure.
- **Tags**: any sample/smoke test added carries `tag: ['@<classification>', '@<unique-scenario>']`.
- **CI**: headless, `npm ci`, browser caching or official `mcr.microsoft.com/playwright:v<installed-version>-<distro>` image,
  lint + typecheck + prettier gates, sharding, report publishing, secrets from the CI secret store only.
- **Security**: no secrets committed; update `.gitignore` if new report/auth dirs are introduced.
- Update `README.md` for any new command, env var, folder or project.

## Phase 5 — Verify nothing broke

Run and compare against the Phase 2 baseline:
- `npx tsc --noEmit`
- `npx eslint .`
- `npx prettier --check <changed files>`
- `npx playwright test --list` (all previously listed tests still listed, plus new ones)
- Run any new sample test and a representative existing test **with the sandbox override from the
  start** (see `.ai/context/`). Do not try sandboxed first.

Any new failure introduced by the change must be fixed. Pre-existing failures and known
environment gaps (see `.ai/context/`) are reported, not "fixed" by weakening tests.

## Phase 6 — Write `docs/setup-framework.md`

This is the hand-off for the `review-code-changes` skill / `code-review-agent`. Include:

1. Summary and link to `docs/plans/framework-setup-plan.md`.
2. Inputs (I–IV answers).
3. **Code change list** — table: `File | Change type (added/modified/deleted) | Purpose | Principle(s)`.
4. For every modified pre-existing file: a short before/after or diff excerpt and why it is backward compatible.
5. New dependencies and versions (verified against the lockfile).
6. Commands executed (CLI) and verification results (typecheck, lint, prettier, `--list`, test runs) with pass/fail counts.
7. Deviations from the approved plan, with reasons.
8. Known issues / follow-ups for the SDET (e.g. secrets to configure in CI).

Finish by telling the user where the plan and change log are, and suggesting
`review-code-changes docs/setup-framework.md` as the next step. If this run surfaced a new,
non-obvious learning, propose adding it to `.ai/context/automation-pipeline-learnings.md`.
