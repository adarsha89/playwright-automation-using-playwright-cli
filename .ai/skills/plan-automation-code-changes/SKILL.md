---
name: plan-automation-code-changes
description: Plan Playwright + TypeScript test automation code changes for a feature (UI and/or API). Collects page URLs/designs/flows or API docs, feature docs, known assertions and tagging needs, first explores the real pages and APIs with playwright-cli in headless mode, then writes a parametrized, high-coverage plan with Mermaid diagrams to docs/plans/<feature-slug>-plan.md for review. Does not write test code.
argument-hint: "[feature description, requirements md path, URLs or API docs]"
---

# plan-automation-code-changes

Produces a reviewable code-change plan. **Plans only — no changes to `tests/`, `pages/`,
`fixtures/`, `api/`, `data/`, `config/` or `utils/`.** The `make-code-changes` skill implements it.

Before starting, read:
- Every file in `.ai/context/` (start with `ai-assistant-instructions.md`) (rules override everything here)
- `.ai/skills/playwright-cli/SKILL.md` — the exploration tool for Phase 2
- The existing framework: `fixtures/index.ts`, `config/env.ts`, `pages/**`, `api/**`, `data/**`,
  `utils/**`, relevant `tests/**`, `playwright.config.ts`
- `docs/requirements/<feature-slug>-requirements.md` if the `analyze-task` skill produced one —
  treat it as the primary source of goals and acceptance criteria.

## Phase 1 — Gather inputs

Use anything already provided. Ask for the rest **one question at a time** (structured-question UI
where available). Never invent answers.

1. **Sources of truth for behaviour** — page URLs, Figma/design links, user-flow descriptions;
   and/or API docs (OpenAPI/Swagger, Postman) or sample request/response pairs for every API involved.
2. **Feature documentation** (optional) — Jira/Confluence links or Word/PDF files. If a link can't be
   accessed, say so and ask the user to paste the relevant content; don't guess its contents.
3. **Known assertions/expectations** — anything the user already knows must be verified
   (copy, validation messages, status codes, business rules).
4. **Tagging/grouping** — which classification tags (`@smoke`, `@regression`, `@api`, `@a11y`, …)
   and which environments the tests must run on. Don't ask about browsers (see Browser scope in Phase 3).

Derive a kebab-case `<feature-slug>` and confirm it.

## Phase 2 — Explore with `playwright-cli` first (UI and API)

Do this before designing coverage or choosing locators. Follow
`.ai/context/ui-automation-workflow.md` [TEMPERATURE 0 — NON-NEGOTIABLE]: `playwright-cli` only,
always headless, never `npx playwright codegen`.

**UI**
- Open each page in scope with `open --device "Desktop Chrome"` and walk every state: happy path, validation errors,
  empty states. If the flow depends on fixture state, explore through a test with `CI=1 ... --debug=cli`.
- Record for each page: URL/route, stable locator per element (prefer role/label/`data-test(id)`;
  headings scoped with `level`), expected values, dynamic content, network calls worth intercepting.
- Normalize generated locators to the repo rules and confirm each final form on the live page.

**API**
- Exercise each endpoint with `run-code` and `page.request` to confirm request shape, status codes,
  response schema, auth and error payloads. Never assume an endpoint exists (see the `/auth/login`
  learning in `.ai/context/automation-pipeline-learnings.md`).
- Use provided samples only for an endpoint you can't reach or safely call, and mark those findings
  in the plan as unverified against a live target.

Save the evidence to `docs/exploration/<feature-slug>-exploration.md`, then close the session.

## Phase 3 — Design coverage

Build a **test-case matrix** — every row traces to a requirement, a user-provided expectation,
or an observed behaviour from exploration:

| ID | Scenario | Type (positive/negative/boundary/state) | Data (parametrized set) | Assertions | Tags (classification + unique) | Project(s) | Source |

Coverage rules:
- Parametrize instead of duplicating (`for (const c of CASES) test(...)` with the case data in
  `data/<site>/*.data.ts`), each generated test still getting its **own unique tag** from the data row.
- Cover positive, negative, boundary/equivalence classes, state transitions, error handling,
  and (API) schema validation (Zod), status codes and auth failures.
- Don't pad: every case must be justified by a source. List plausible-but-unconfirmed cases
  separately under "Candidate cases — needs confirmation".
- Unique tags must not collide with existing ones — `grep -rn "@<tag>" tests/` to check.
- **Browser scope:** plan UI tests on `...devices['Desktop Chrome']` only, which is the `chromium`
  project; API tests stay on `api`. Don't plan Firefox/WebKit runs or new browser projects: the SDET
  checks other browsers. The planned code must stay browser agnostic: no `browserName` branches or
  skips, no project-name or user-agent checks, no Chromium-only APIs (CDP sessions, `page.coverage`)
  and no engine-specific selectors.

## Phase 4 — Write the plan

Write `docs/plans/<feature-slug>-plan.md` containing:

1. **Overview** — goal, scope, out of scope, links to requirements/exploration.
2. **Inputs received** — summary of each answer from Phase 1.
3. **Exploration findings** — pages/endpoints, verified locators table (element → locator → evidence line in the exploration file).
4. **Diagrams (Mermaid)**:
   - *Structure*: which specs, page objects, components, fixtures, clients, data files, utils are involved (new vs. existing).
   - *Workflow*: the user/API flow under test (sequence or flowchart), including where each assertion happens.
   - *Execution*: tags/projects → which tests run where (e.g. `@smoke` in CI on chromium).
5. **Test-case matrix** (Phase 3) and parametrization strategy.
6. **Code change list** — per file: path, create/modify, exact responsibilities (class/method/fixture/data
   names and signatures), and which principle(s) a–j it serves. Include `config/env.ts` + `.env.example`
   changes (new `<SITE>_BASE_URL`, safe URL joining), and `README.md`/`to_be_automated.md` updates.
7. **Tagging plan** — classification tags, unique tags per test, grep commands to run subsets.
8. **Test data & security** — synthetic data builders, secrets needed (env names only, never values).
9. **Reliability notes** — waiting strategy, isolation, network interception, flakiness risks.
10. **Verification plan** — `npx tsc --noEmit`, `npx eslint`, `npx prettier --check`, and the exact
    `npx playwright test --grep @<tag> --project=chromium` commands (`--project=api` for API tests; to be run with the sandbox override).
11. **Risks, assumptions, open questions.**

## Phase 5 — Hand off

Summarise the plan in a few lines, give its path, and ask the user to review. Next step after
approval: `make-code-changes docs/plans/<feature-slug>-plan.md`.
