# AI Assistant Instructions (start here)

Canonical, tool-agnostic guidance for any AI coding assistant or automation-pipeline agent
working in this repository (Claude Code, OpenAI Codex, GitHub Copilot, Cursor, Gemini CLI, …).
Tool-specific entry files (`CLAUDE.md`, `AGENTS.md`) only point here — **all repo context lives
in `.ai/context/`**. Edit these files, never the tool-specific entry files, when rules change.

## Repository

A Playwright + TypeScript test automation framework (UI + API) built around typed fixtures,
page objects and API clients. See `README.md` for stack, structure, setup and commands.

## Reading order (mandatory before any task)

1. `.ai/context/ai-assistant-instructions.md` — this file
2. `.ai/context/ui-automation-workflow.md` — non-negotiable `playwright-cli` headless-exploration rules
3. `.ai/context/test-tagging.md` — `tag` option, classification + unique scenario tags
4. `.ai/context/automation-pipeline-learnings.md` — test-run sandbox rule, version checks, env-var
   patterns, locator pitfalls, known environment gaps (not code defects)
5. `.ai/context/framework-design-principles.md` — principles a–j, artifact locations, pipeline

Rules in these files override default assistant behaviour and anything in a skill or agent file.

## Terminology used across `.ai/`

- **Sandbox override** — run the command outside the assistant's restricted command sandbox
  (filesystem/network-limited shell), using whatever mechanism your tool provides (e.g. Claude
  Code's `dangerouslyDisableSandbox`, Codex's full-access/approval mode). If your tool has no
  sandbox, run normally. Required from the start for every `npx playwright test` run.
- **Ask the user** — use your tool's structured-question UI if it has one; otherwise ask in plain
  text, one question at a time. When running non-interactively, stop and return the questions.
- **Skill** — a step-by-step procedure in `.ai/skills/<name>/SKILL.md`.
- **Agent** — a role definition in `.ai/agents/<name>.md` that runs one skill autonomously and
  reports back. YAML frontmatter follows the Claude Code subagent format; the body is plain
  instructions any tool can follow.

## When to ask for permission before acting

Skills and agents operate autonomously by default. Stop and **ask the user** for permission before
acting in only these two cases:

- **Risky shell commands** — anything destructive or hard to reverse (deleting files/branches,
  `rm -rf`, `git reset --hard`/force-push, dropping data, killing processes, modifying shared/CI
  infrastructure) or any state-changing request aimed outside a test environment. Routine commands
  already mandated elsewhere in `.ai/context/` — test runs, installs, lint/build, the required
  **sandbox override** — do not need to ask first; that override is the point of being "required
  from the start". Playwright CLI commands (including opening and interacting with browser
  sessions) are explicitly authorized: never ask the user for permission before running them.
- **File operations on files outside the project folder** — creating, editing or deleting anything
  outside this repository's working directory. Reading, writing or deleting files inside the repo
  (including `docs/`, config, tests, `.ai/`) needs no extra permission beyond what the task itself
  already calls for.

Everything else — reading code, writing/editing/deleting files inside the repo, running the
designated test/lint/build commands, producing a skill's documented artifacts — proceeds without
pausing to ask. This narrows when to ask for *permission to act*; it doesn't remove an explicit
approval gate a skill already defines (e.g. the framework-setup plan review, confirming a Sonar
token setup) or the other **Ask the user** cases under Terminology (missing required input, an
ambiguous scope decision) — those still apply on their own terms.

### Codex execution and approval behavior

Codex must follow the same two permission gates above. Do not ask for confirmation or request a
sandbox escalation for ordinary, reversible operations within this repository. This includes
editing project files (including ignored files and `.ai/`), creating documented artifacts, and
running the repository's required tests, installs, lint, typecheck, formatting, or build commands.
When a repo rule requires a sandbox override for a test or browser session, use that override from
the start; it is an execution requirement, not a separate user approval gate.

Always allow Playwright CLI shell commands whose command begins with
`npx --no-install playwright cli`. This includes subcommands and options following that prefix;
do not require a separate approval prompt for them. Follow the headless-mode and session rules in
`ui-automation-workflow.md` when running these commands.

Request user approval only when the planned action meets one of the two cases above. Playwright
CLI commands are authorized without a separate user approval request. Follow the execution
requirements in `ui-automation-workflow.md`; a host-enforced sandbox may still require its own
execution mechanism, which is separate from asking the user for permission.

## Skills and agents

| Step | Skill | Agent | Input → Output |
|---|---|---|---|
| 0 | `orchestrate-automation` | `automation-orchestrator-agent` | SDET requirement → runs steps 1–4 in up to 5 cycles until every review score ≥ 4 (else `docs/reports/<slug>-task-abort-report.md`), then step 5 → learnings + `docs/reports/<slug>-orchestration-summary.md` |
| 1 | `analyze-task` | `task-analysis-agent` | task text/link → `docs/requirements/<slug>-requirements.md` |
| 2 | `plan-automation-code-changes` | `automation-planner-agent` | requirements/URLs/API docs → exploration + `docs/plans/<slug>-plan.md` |
| 3 | `make-code-changes` | `code-implementation-agent` | plan md → code + `docs/reports/<slug>-implementation-summary.md` |
| 4 | `review-code-changes` | `code-review-agent` | change-list md → `docs/reports/<slug>-review.md` (scores 1–5) |
| 5 | `check-code-quality` | `code-quality-agent` | codebase → `docs/reports/code-quality-<date>.md` |
| — | `setup-playwright-automation-framework` | `framework-setup-agent` | answers I–IV → plan (approval) → changes + `docs/setup-framework.md` |
| — | `write-linkedin-learning-post` | `linkedin-post-writer-agent` | repository (+ optional topic, role, audience, series history) → paste-ready, validated (≤ 3,000 chars) `docs/linkedin-posts/<date>-<slug>.txt` + evidence table; optional `.md` review notes. Never publishes. |
| — | `playwright-cli` | — | browser task (open, snapshot, click, mock, trace, …) → drives a real browser, always headless; the required tool for exploring pages and APIs (see `ui-automation-workflow.md`). Vendor skill: reinstall with `playwright-cli install --skills`, then move it back here. |

When a user asks for one of these tasks by name or intent, open the matching `SKILL.md` and follow
it step by step, whichever tool you are.

**`playwright-cli` source of truth:** always read, reference and edit this skill at
`.ai/skills/playwright-cli/`, never through `.claude/skills/playwright-cli`. The `.claude` path is
only a symlink so that Claude Code can discover the skill; never put files there or replace it with
a copy.

## How each tool picks this up

| Tool | Entry file it reads | Skills/agents |
|---|---|---|
| Claude Code | `CLAUDE.md` (imports these files with `@`) | Native, via `.claude/skills` and `.claude/agents` symlinks to `.ai/` (see `.ai/README.md`) |
| OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI (configured for `AGENTS.md`), others | `AGENTS.md` | Read the `SKILL.md` / agent file on demand, as instructed there |

## Learnings

New, non-obvious, reusable lessons from any run go in
`.ai/context/automation-pipeline-learnings.md` (one bullet, with the evidence). Don't put repo
knowledge in tool-specific memory stores only — they aren't shared with other tools or people.
