---
name: analyze-task
description: Analyze an automation task (ticket text, scenario description, to_be_automated.md entry, feature doc) and turn it into a clear, explicit requirements document for writing Playwright + TypeScript tests — goals, scope, acceptance criteria, test data and environment needs — written like a Lead SDET briefing a junior engineer, with no implementation details. Writes docs/requirements/<feature-slug>-requirements.md.
argument-hint: "<task description, file path, or link>"
---

# analyze-task

Input: the task (`$ARGUMENTS`) — free text, a file path (e.g. an entry in `to_be_automated.md`),
or a Jira/Confluence link/Word file. If a link can't be read, ask the user to paste the content.

Output: `docs/requirements/<feature-slug>-requirements.md` describing **what** must be tested
and **how success is judged** — never **how** to build it.

## Rules

- **No implementation details**: no locators, selectors, class/file/function names, fixture
  designs, code snippets or library choices. (Naming the target URL, user-visible labels/copy
  that are part of the requirement, and API endpoints/status codes that are part of the contract
  is fine — those are requirements, not implementation.)
- **No invention**: every requirement traces to the task, a referenced doc, or a user answer.
  Unknowns become explicit open questions, not assumptions. If an assumption is unavoidable,
  label it `ASSUMPTION` and list it for confirmation.
- Be explicit and testable: each acceptance criterion is observable and pass/fail
  (Given/When/Then is welcome).
- Respect the known constraints in `.ai/context/automation-pipeline-learnings.md` (e.g. the Users
  API tests need a real `/auth/login` backend) and flag them as environment dependencies.

## Steps

1. Read every file in `.ai/context/`, `README.md`, `to_be_automated.md`, and existing `docs/requirements/*` to
   avoid duplicating work already specified or automated (check `tests/` for existing tags covering it).
2. Extract: actors/user roles, preconditions, flows (happy path + alternates + errors), business
   rules, data variations, API contracts, non-functional expectations (a11y, visual, performance) if stated.
3. If critical information is missing (target environment, credentials source, expected messages,
   scope boundaries), ask the user **one question at a time** before writing. Keep questions to
   what genuinely blocks a clear requirement.
4. Choose a kebab-case `<feature-slug>` and write the document.

## Re-analysis after review

Used when the `orchestrate-automation` skill sends a failed review back (cycle ≥ 2). Input: the
original requirement, the existing `docs/requirements/<feature-slug>-requirements.md` and the latest
`docs/reports/<feature-slug>-review*.md`.

1. Keep the same slug and file; set `Status: Revision <n> (after review cycle <n−1>)`.
2. For every scorecard parameter below 4 and every blocker/major finding, decide whether it shows
   a requirement gap (missing/ambiguous AC, wrong scope, unstated constraint) or an implementation
   defect against a correct requirement.
3. Fix requirement gaps in the relevant sections. Add section `## 13. Review-cycle <n−1> findings
   to resolve`: `Finding ID | Parameter (score) | Requirement impact | AC affected/added` — one row
   per finding, stated as observable outcomes. Implementation defects are listed with "no
   requirement change — implementation must satisfy AC-x" and a pointer to the review report for
   the `file:line` detail (still no implementation detail in this document).
4. Don't drop or weaken an existing AC to make a finding disappear; if a finding shows an AC was
   wrong, change it and record why in section 11.
5. Append a line to a `## Revision history` section at the end: date, cycle, what changed.

## Document structure

```markdown
# <Feature> — Automation Requirements
Source: <task/ticket/links> · Date: <YYYY-MM-DD> · Status: Draft for review

## 1. Objective            — why this automation exists, in 2–4 sentences
## 2. Scope                — in scope / out of scope (explicitly name exclusions and existing coverage)
## 3. Target & environment — application URL(s)/API base, environments (browser is always Desktop Chrome; the SDET checks other browsers separately)
## 4. Preconditions        — accounts/roles, data state, feature flags
## 5. Scenarios            — numbered; each with goal, steps in user/business language, expected outcomes
## 6. Acceptance criteria  — AC-1..n, observable and pass/fail, mapped to scenarios
## 7. Test data            — variations/equivalence classes needed; synthetic vs. provided; no secrets
## 8. Classification       — expected grouping (smoke/regression/api/…) and that each test needs a unique scenario tag
## 9. Non-functional       — only if stated (a11y, visual, performance, security)
## 10. Dependencies & risks — environment gaps, third-party sites, flaky areas
## 11. Open questions / assumptions
## 12. Definition of done  — e.g. all ACs automated and passing on Desktop Chrome (API tests on the `api` project), reviewed, `.ai/context/` rules followed (headless exploration first, tags)
```

Finish by summarising the objective and number of ACs, listing open questions, and suggesting
`plan-automation-code-changes docs/requirements/<feature-slug>-requirements.md` as the next step.
