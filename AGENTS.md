# AGENTS.md

Entry point for AI coding assistants (OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, …).
All repo context is tool-agnostic and lives in `.ai/context/` — edit those files, not this one.

**Before doing any task in this repo, read these files in full, in order. Their rules are
mandatory and override your default behaviour:**

1. `.ai/context/ai-assistant-instructions.md` — start here: terminology, skills/agents catalogue
2. `.ai/context/ui-automation-workflow.md`
3. `.ai/context/test-tagging.md`
4. `.ai/context/automation-pipeline-learnings.md`
5. `.ai/context/framework-design-principles.md`

Skills (step-by-step procedures) are in `.ai/skills/<name>/SKILL.md`; agent roles are in
`.ai/agents/<name>.md`. When a task matches one, open that file and follow it.
