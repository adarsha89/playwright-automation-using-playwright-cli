---
name: review-code-changes
description: Thoroughly review Playwright + TypeScript automation code changes listed in a markdown change log (e.g. an implementation summary or docs/setup-framework.md) against the functional requirements, repo rules in .ai/context and framework principles a–j. First explores the affected pages and APIs with playwright-cli in headless mode. Scores each parameter 1–5 with evidence; correctness and coverage are judged strictly (temperature 0 — no assumed test cases). Writes docs/reports/<feature-slug>-review.md.
argument-hint: "<path to md listing the code changes>"
---

# review-code-changes

Input: a md file listing code changes (`$ARGUMENTS`) — typically
`docs/reports/<feature-slug>-implementation-summary.md` or `docs/setup-framework.md`.
If none is given, ask for it. This skill **reviews only — it does not edit code.**

## Strictness mode (temperature 0)

For **correctness** and **coverage**, be deterministic and evidence-bound:
- Every finding cites `file:line` and the rule/requirement it violates. No finding without evidence.
- Coverage is measured **only** against explicitly stated requirements/acceptance criteria/user
  expectations (requirements doc, plan, user-provided assertions). Do **not** invent "you should also
  test X" cases unless they follow unambiguously from a stated requirement. Anything else goes in an
  optional "Suggestions (non-scoring)" list.
- Don't trust the change log's claims — read the actual files and re-run the checks yourself.
- Same inputs must produce the same scores: use the rubric below literally.

## Step 1 — Gather context

Read:
- The input md and every file it lists (full files, not just excerpts); also `git diff` / `git status`
  to catch changes the md forgot to list (report omissions as findings).
- Every file in `.ai/context/`, plus any persistent assistant memory your tool keeps for this repo, if present.
- The requirements doc, plan and exploration files referenced by the md.
- `.ai/skills/playwright-cli/SKILL.md` — the exploration tool for Step 2.

## Step 2 — Explore with `playwright-cli` first (UI and API)

Do this before the static checks and before judging the code, using the rules in
`.ai/context/ui-automation-workflow.md`: `playwright-cli` only, always headless, never
`npx playwright codegen`. See what the target really does, then compare it to the code.

- **UI:** with `open --device "Desktop Chrome"`, walk the flows the requirements describe. For each locator and
  expected value the change introduces, confirm it resolves to the intended single element and that
  the asserted value matches the live page. Use `CI=1 ... --debug=cli` when the flow depends on fixture state.
- **API:** with `run-code` and `page.request`, call each endpoint the change touches and compare status
  codes, response schema, auth and error payloads to the client code, schemas and assertions.
- **Failing tests:** in Step 3, reproduce any failure with `CI=1 ... --debug=cli` to separate a code defect
  from an app or environment problem.

Limits:
- Review-only: don't edit code, and don't write under `docs/exploration/`. Quote observations in the report.
- Exploration checks claims; it doesn't widen coverage. Behaviour you notice beyond the stated
  requirements goes in "Suggestions (non-scoring)".
- If the target can't be reached, record what couldn't be verified and why. Don't treat it as passed
  or infer the result. If the change touches no page or API, record this step as `N/A`.

## Step 3 — Verify independently

```bash
npx tsc --noEmit
npx eslint <changed files>
npx prettier --check <changed files>
npx playwright test --list --grep "<tags of changed tests>" --project=chromium   # API tests: --project=api
```
Run the changed tests (`npx playwright test --grep ... --project=chromium`, or `--project=api` for API tests) **with the sandbox override from the start**.
Review on `...devices['Desktop Chrome']` only; don't run Firefox/WebKit, because the SDET checks other browsers.
Record exact results. Known environment gaps from `.ai/context/automation-pipeline-learnings.md` are noted, not scored as defects.

## Step 4 — Review checklist

Correctness
- Assertions actually prove the requirement (right locator, right expected value, not tautological).
- Locators exist in the exploration evidence and resolved on the live page in Step 2; no guessed selectors; headings scoped with `level`.
- Async correctness: every Playwright call awaited; no floating promises; no race-prone patterns.
- Fixture scope/teardown correct; test isolation (no shared mutable state between tests).
- URL building uses safe joins; env vars via `config/env.ts` only.

Repo rules (`.ai/context/`)
- Tags: `tag` option used, classification + unique tag per test, no duplicate unique tags (`grep -rn`).
- New site → dedicated `<SITE>_BASE_URL` + `.env.example`; shared `BASE_URL` untouched.
- Browser agnostic: changed code has no `browserName` branches or skips, project-name or user-agent checks, Chromium-only APIs (CDP sessions, `page.coverage`) or engine-specific selectors. Not having run other browsers is not a finding.
- `playwright-cli` exploration artifact present for UI changes; versions pinned match the lockfile; flat ESLint config.

Principles a–j (see context file) — layering, reuse, config, readability, maintainability,
scalability, robustness (no hard waits/`test.only`), reporting, security (no secrets/PII), CI readiness.

## Step 5 — Score (1–5 each)

| Score | Meaning |
|---|---|
| 5 | No findings. |
| 4 | Only minor/nit findings; nothing affecting behaviour or rules. |
| 3 | At least one major finding (maintainability/rule deviation) but no correctness defect. |
| 2 | At least one correctness defect or a non-negotiable `.ai/context/` rule broken. |
| 1 | Multiple correctness defects, or the change does not compile / tests cannot run due to the code. |

Parameters: **Correctness**, **Requirement coverage**, **Architecture & reusability (a, b)**,
**Configurability (c)**, **Readability & style (d)**, **Maintainability & locators (e)**,
**Scalability & tagging (f)**, **Robustness & reliability (g)**, **Reporting & traceability (h)**,
**Security & data hygiene (i)**, **CI/CD readiness (j)**, **Repo-rule compliance (`.ai/context/`)**.

Mark a parameter `N/A` if the change doesn't touch it. **Overall** = the minimum of Correctness and
Requirement coverage, otherwise the rounded mean — a change with a correctness defect can't score
above 2 overall. **Verdict**: `Approve` (overall ≥ 4 and no blocker) · `Approve with nits` ·
`Changes requested` (any blocker or overall ≤ 3).

## Step 6 — Write the report

Write `docs/reports/<feature-slug>-review.md` (derive the slug from the input file; if a review
already exists, append `-cycle-<n>` and link the previous one):

1. Scope reviewed (input md, files, commit/diff base), live exploration results (what was checked with `playwright-cli`, what couldn't be verified) and verification results.
2. Scorecard table: `Parameter | Score | Justification`.
3. **Coverage matrix**: `Requirement/AC | Covered by (test + tag) | Status (covered/partial/missing)`.
4. Findings table, most severe first: `ID | Severity (blocker/major/minor/nit) | file:line | Issue | Rule/requirement | Suggested fix`.
5. Suggestions (non-scoring).
6. Verdict and what must change for approval.
7. Proposed new learnings for `.ai/context/automation-pipeline-learnings.md`, if the review surfaced a non-obvious, reusable lesson.

If your tool has a structured findings/review-comment feature and the caller asked for it, also report findings there.
Tell the user the verdict, overall score and report path.
