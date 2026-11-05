---
name: orchestrate-automation
description: Run the full automation pipeline for an SDET's requirement end to end — task analysis → planning → coding → code review, repeated up to 5 cycles until every review parameter scores at least 4 (else abort with a task abort report) — then code quality, persist reusable learnings to the shared repo memory, and report a summary with the SDET's original requirement and the analysed requirements. Delegates each stage to its agent.
argument-hint: "<requirement text, file path, or link>"
---

# orchestrate-automation

Drives the five pipeline agents in order and owns the loop, the quality gate, the abort decision
and the final summary. **The orchestrator coordinates; it does not analyse, plan, code, review or
score anything itself.** Flow diagram: `.ai/agents/automation-orchestrator-agent.md`.

Input: the SDET's requirement (`$ARGUMENTS`) — free text, a file path (e.g. an entry in
`to_be_automated.md`) or a link. If none is given, ask for it. Save it **verbatim**; it is quoted
unchanged in the final summary.

## Stages and agents

| Stage | Agent (`.ai/agents/`) | Skill (`.ai/skills/`) | Input | Output |
|---|---|---|---|---|
| A. Task analysis | `task-analysis-agent` | `analyze-task` | requirement (cycle 1) / requirement + requirements doc + review report (cycle ≥ 2) | `docs/requirements/<slug>-requirements.md` |
| B. Planning | `automation-planner-agent` | `plan-automation-code-changes` | requirements doc (+ review report, cycle ≥ 2) | `docs/plans/<slug>-plan.md` (+ `docs/exploration/`) |
| C. Coding | `code-implementation-agent` | `make-code-changes` | plan (+ review report, cycle ≥ 2) | code + `docs/reports/<slug>-implementation-summary.md` |
| D. Code review | `code-review-agent` | `review-code-changes` | implementation summary | `docs/reports/<slug>-review[-cycle-<n>].md` |
| E. Code quality | `code-quality-agent` | `check-code-quality` | codebase | `docs/reports/code-quality-<YYYY-MM-DD>.md` |

## Rules

- **Read every file in `.ai/context/` first** (start with `ai-assistant-instructions.md`), and pass
  that instruction on to every agent. Their rules override this skill.
- **Hand over files, not summaries.** Each agent gets the *paths* of the previous stage's
  artifacts and reads them itself. Never paraphrase an artifact into the next prompt in place of
  the file.
- **Stay a coordinator.** Don't edit `tests/`, `pages/`, `fixtures/`, `api/`, `data/`, `config/`,
  `utils/` or any agent's artifact. You write only the orchestration log, the abort report, the
  summary, and learnings (step 5).
- **One stage at a time.** Start a stage only after the previous stage's artifact exists; check
  the path the agent reported before moving on. A missing artifact is a stage failure: re-run
  that stage once with the error, then abort (step 3.3) if it fails again.
- **Questions from an agent** (it returns numbered open questions instead of an artifact): ask the
  SDET, one question at a time, and re-run the same stage with the answers. This doesn't use up a
  cycle. Running without a human: stop and write the abort report with reason `Blocked on input`
  and the questions.
- **Plan approval**: invoking this skill authorises implementing the plans it produces, unless
  the SDET asked for a checkpoint ("let me approve the plan"), in which case pause after stage B of
  each cycle and wait for approval.
- Test runs use the sandbox override from the start (`.ai/context/automation-pipeline-learnings.md`).
  Never commit, push, or print/request secrets.
- **Execution mode.** Prefer starting each agent as a separate sub-agent with a fresh context, so
  the reviewer stays independent of the code author. If your tool can't start sub-agents from
  here (e.g. in Claude Code a sub-agent can't start other sub-agents — run this skill in the main
  session instead), perform each stage yourself by opening that agent's file and its skill and
  following them strictly in order, re-reading artifacts from disk at each stage. Record which mode
  was used in the summary.

## Step 1 — Start

1. Save the SDET's requirement verbatim and the start time.
2. Create the orchestration log `docs/reports/<slug>-orchestration-log.md` as soon as stage A
   returns a slug (use `orchestration-<YYYY-MM-DD-HHmm>` until then, then rename). Append one row
   per stage run: `Cycle | Stage | Agent | Input paths | Output path | Result | Notes`.

## Step 2 — Run a cycle (n = 1 … 5)

**A. Task analysis** — `task-analysis-agent`:
- Cycle 1: the requirement verbatim. The agent picks the `<slug>`; reuse it for every later stage
  and cycle.
- Cycle ≥ 2: the original requirement, `docs/requirements/<slug>-requirements.md` and the latest
  review report, with the instruction to follow `analyze-task`'s **Re-analysis after review**
  section: update the same requirements doc, turning every review parameter scored below 4 and
  every blocker/major finding into requirement-level changes (keep it implementation-free; point
  to the review report for `file:line` detail).

**B. Planning** — `automation-planner-agent`: the requirements doc path (cycle ≥ 2: plus the review
report; update the existing plan with a "Cycle <n> changes" section instead of starting over, and
re-explore only where new or changed UI locators are needed).

**C. Coding** — `code-implementation-agent`: the plan path (cycle ≥ 2: plus the review report, so
it adds a "Review cycle <n> fixes" section to the implementation summary).

**D. Code review** — `code-review-agent`: the implementation summary path. The review skill
writes `-cycle-<n>` reports and links the previous one from cycle 2 on.

## Step 3 — Review gate

1. Open the review report and read the scorecard (`Parameter | Score | Justification`) yourself —
   don't rely on the agent's message. Parameters marked `N/A` are excluded.
2. **Pass** = every scored parameter is ≥ 4 **and** the verdict isn't `Changes requested`. (If
   the scores and verdict disagree, treat it as a fail and note the inconsistency.) → go to step 4.
3. **Fail**, n < 5 → log the parameters below 4 and start cycle n + 1 at stage A.
   **Fail**, n = 5 (or a stage failed twice, or blocked on input) → **abort**: write
   `docs/reports/<slug>-task-abort-report.md`, skip stages E and step 5's quality inputs, and
   finish with step 6 marked `ABORTED`.

Task abort report contents:
1. Reason (`Review gate not met after 5 cycles` / `Stage <X> failed twice` / `Blocked on input`).
2. The SDET's requirement, verbatim.
3. Score trend: `Parameter | Cycle 1 | … | Cycle n` — highlight parameters that never reached 4.
4. Unresolved findings from the last review (ID, severity, `file:line`, issue), and why they
   persisted if the cycle history shows it (e.g. environment gap, contradictory requirement).
5. State of the working tree: files changed, tests passing/failing — the changes are **not**
   reverted; the SDET decides.
6. Recommended next action (e.g. clarify requirement X, fix environment gap Y, human fix of Z).
7. Links to every artifact from every cycle.

## Step 4 — Code quality

`code-quality-agent` with the scope (the files changed in this run, plus the whole codebase for
context). A skipped Sonar gate (no server/token configured) is expected, not a failure. The quality
report doesn't restart the loop; list its recommendations in the summary for the SDET to action.

## Step 5 — Persist learnings (shared repo memory)

Collect candidate learnings from: every review report's "Proposed new learnings", the quality
report, and what this run itself showed (e.g. a finding that recurred across cycles, a stage that
failed for an environmental reason, a question every run will need answered).

Keep only **non-obvious, reusable** lessons that should shape all future code changes in this
repo and aren't already recorded. Append each as one bullet with its evidence (artifact paths) to
`.ai/context/automation-pipeline-learnings.md` — this is the repo's shared memory: `CLAUDE.md`
imports it for Claude Code and `AGENTS.md` points every other tool to it. **Never edit `CLAUDE.md`
or `AGENTS.md` directly** (they are thin pointers), and never store repo knowledge only in a
tool-specific memory. Do this for aborted runs too — why a run aborted is often the most useful
lesson. If nothing qualifies, say so.

## Step 6 — Summary

Write `docs/reports/<slug>-orchestration-summary.md` and present the same content to the SDET:

1. **Status**: `COMPLETED` (review gate met in cycle n) or `ABORTED` (link the abort report);
   execution mode used.
2. **Initial requirement from the SDET** — verbatim, in a quote block.
3. **Requirements from the task analysis agent** — path, objective, the acceptance criteria list
   (AC-1…n), scope exclusions, open questions/assumptions; plus what each re-analysis cycle
   changed.
4. **Cycle history**: `Cycle | Overall | Lowest parameter(s) | Verdict | Key fixes`.
5. **Changes made**: files added/modified (with one line each), tests and tags added, test run
   results (with known environment gaps called out as such).
6. **Final review scorecard** and **code quality** headline (gate status, ESLint/tsc/Prettier
   counts, top recommendations).
7. **Learnings added** to `.ai/context/automation-pipeline-learnings.md` (or "none").
8. **Open items** for the SDET (questions, environment gaps, quality recommendations), and a
   reminder that nothing was committed or pushed.
9. Links to every artifact.
