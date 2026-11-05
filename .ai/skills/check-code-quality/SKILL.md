---
name: check-code-quality
description: Set up SonarQube / SonarCloud / Sonar Scanner CLI for this TypeScript Playwright codebase if not already configured, run a scan, and write a code quality report (quality gate, bugs, vulnerabilities, code smells, duplication, hotspots) to docs/reports/code-quality-<date>.md. Falls back to ESLint + tsc + Prettier metrics when no Sonar server/token is available.
argument-hint: "[optional: sonarcloud|sonarqube, server URL, project key, scope path]"
---

# check-code-quality

Before starting, read every file in `.ai/context/` (note: no Sonar server/token is configured yet — a skipped
Sonar gate is expected, not a pipeline defect).

## Step 1 — Detect existing setup

Check for `sonar-project.properties`, `sonar-scanner` in `package.json`, a Sonar stage in
`Jenkinsfile`/other CI files, and whether `SONAR_TOKEN` (and `SONAR_HOST_URL` for SonarQube) are
set in the environment (`[ -n "$SONAR_TOKEN" ] && echo set` — never print the value).

## Step 2 — Set up if missing

Ask (one at a time, only what's unknown):
1. SonarCloud or self-hosted SonarQube? (If unsure and Docker is available, offer a local
   `sonarqube:community` container for a one-off scan.)
2. Server URL (SonarQube) or organization key (SonarCloud), and project key.
3. Confirm the token is exported as `SONAR_TOKEN` in their shell/CI secret store.
   **Never ask the user to paste a token into chat and never write it to a file.**

Then add (after confirming with the user):
- `sonar-project.properties`:
  ```properties
  sonar.projectKey=<key>
  # sonar.organization=<org>          # SonarCloud only
  sonar.sources=pages,fixtures,api,data,utils,config
  sonar.tests=tests
  sonar.test.inclusions=tests/**/*.spec.ts
  sonar.exclusions=node_modules/**,playwright-report/**,test-results/**,reports/**,docs/**
  sonar.typescript.tsconfigPaths=tsconfig.json
  sonar.eslint.reportPaths=reports/eslint-report.json
  sonar.sourceEncoding=UTF-8
  ```
- Scanner: prefer the npm package (`npm i -D sonarqube-scanner` — check the latest version and
  record it) with a `"sonar": "sonar-scanner"` script, or the official Docker image
  `sonarsource/sonar-scanner-cli`.
- An ESLint JSON report script: `"lint:report": "eslint . -f json -o reports/eslint-report.json"`.
- A CI stage (matching the repo's CI platform) that runs the scan with the token from the CI
  secret store and, optionally, waits on the quality gate (`-Dsonar.qualitygate.wait=true`).
- Ensure `.scannerwork/` and `reports/` are gitignored (they already are — verify).

If the user can't provide a server/token now, **skip Sonar** and continue with the fallback in Step 3.

## Step 3 — Scan

With Sonar available:
```bash
npm run lint:report
npx sonar-scanner -Dsonar.host.url="$SONAR_HOST_URL" -Dsonar.token="$SONAR_TOKEN"
```
Then fetch results via the Web API (`/api/qualitygates/project_status`, `/api/measures/component`
with `bugs,vulnerabilities,code_smells,security_hotspots,duplicated_lines_density,ncloc,sqale_rating,reliability_rating,security_rating`,
and `/api/issues/search`), authenticating with the env token.

Fallback (always run — it's also the local signal alongside Sonar):
```bash
npx tsc --noEmit
npx eslint . -f json -o reports/eslint-report.json
npx prettier --check .
```
Plus repo-specific static checks (grep): `waitForTimeout`, `test.only`, `process.env` outside
`config/env.ts`/`playwright.config.ts`, locators (`page.locator`/`getBy*`) inside `tests/`,
`test(` calls without a `tag` option, duplicated unique tags, hard-coded credentials/URLs.

Network calls to a Sonar server need to leave the sandbox — run them with the sandbox override.

## Step 4 — Report

Write `docs/reports/code-quality-<YYYY-MM-DD>.md`:
1. Setup status (Sonar configured / skipped and why), tool versions, scope scanned.
2. Quality gate status and ratings (A–E) — or "N/A (Sonar skipped)".
3. Metrics table: bugs, vulnerabilities, hotspots, code smells, duplication %, LOC; ESLint errors/warnings;
   tsc errors; Prettier non-compliant file count.
4. Top issues by severity: `Severity | Rule | file:line | Message`.
5. Repo-convention check results (the grep checks above).
6. Trend vs. the previous `docs/reports/code-quality-*.md`, if any.
7. Prioritised recommendations — distinguish issues introduced recently from pre-existing debt.

Tell the user the gate status, headline numbers and the report path. Don't auto-fix code in this
skill — hand fixes to `make-code-changes` via a plan if the user wants them.
