# UI and API Exploration Workflow

Non-negotiable rules for exploring pages and APIs before writing or reviewing automation code.
They apply to every assistant and model, and override `.ai/skills/playwright-cli/` where the two differ.

## Rules

- **[TEMPERATURE 0 — NON-NEGOTIABLE] Explore with `playwright-cli` before writing any UI automation code.** Never write code first and then explore to fix it. This is a strict, zero-deviation rule, not a preference to weigh against convenience, time pressure or how simple the scenario looks. No exceptions.
- **`plan-automation-code-changes` and `review-code-changes` use `playwright-cli` first for pages and APIs**, before any other way of inspecting them. Provided samples or docs are a fallback only when the live target can't be reached, and that must be stated in the output.
- **[NON-NEGOTIABLE] Every `playwright-cli` browser runs headless, never headed.** Never pass `--headed` to `open`; the CLI defaults to headless. `npx playwright test --debug=cli` follows `headless` in `playwright.config.ts`, which is headed locally, so always prefix it with `CI=1` (plus `MUTATION_ENABLED=false`, because the config refuses `CI` with mutation enabled). This covers CLI sessions only; plain `npx playwright test` runs and CI runs are unaffected.
- **Explore UI with the `Desktop Chrome` profile only.** Pass `--device "Desktop Chrome"` to `open` so the session matches the `chromium` project's `...devices['Desktop Chrome']`. The SDET checks other browsers.
- **[NON-NEGOTIABLE] Never use `npx playwright codegen`.** Don't use throwaway exploration scripts outside the CLI either: their output is discarded and can't be reviewed.
- **Never guess a locator, value, status code or endpoint.** Each one must come from output you observed.

## Running the CLI

Commands and options are documented in `.ai/skills/playwright-cli/SKILL.md` and its `references/`. Read them from that path.

- **Command:** use `npx --no-install playwright cli`, which matches the Playwright version in the lockfile. Examples below shorten it to `pw`.
- **Global `playwright-cli`:** use it only for a standalone session that needs a command the local CLI lacks (`recording-*`, emulation, `webmcp-*`). Never use it to `attach` to a test run (see the learnings file).
- **Sandbox override:** use the required sandbox override from the start for every CLI browser
  session, as for `npx playwright test`. Running `playwright-cli` commands is pre-authorized by
  repo policy; do not ask the user for permission or confirmation before running any of them.
- **Sessions:** use one named session per task (`-s=<feature-slug>`). When finished, `close` it and stop any background test run.

## Exploring pages

```bash
pw -s=<feature-slug> open --device "Desktop Chrome" <url>
pw -s=<feature-slug> snapshot                  # or: find "<text>", to search a large page
pw -s=<feature-slug> --raw generate-locator e5 # candidate locator for a ref
pw -s=<feature-slug> --raw eval "el => el.textContent" e5   # expected value for an assertion
pw -s=<feature-slug> fill e3 "<value>"         # each action prints the Playwright code it ran
pw -s=<feature-slug> requests                  # network calls worth intercepting
pw -s=<feature-slug> console
```

Cover every page and state in scope: happy path, validation errors, empty states. Use `--raw snapshot > <file>` to save a snapshot.

**Generated locators are candidates, not finished locators.** Before using one, apply the repo rules: scope headings with `level`, and replace exact volatile copy with a loose regex. For example, `getByRole('heading', { name: 'Playwright enables reliable' })` becomes `getByRole('heading', { name: /playwright/i, level: 1 })`. Confirm the final form still resolves to one element.

If the flow depends on fixture state, explore through a test rather than opening the URL directly:

```bash
CI=1 MUTATION_ENABLED=false PLAYWRIGHT_HTML_OPEN=never npx playwright test --grep "@<tag>" --project=chromium --debug=cli   # in the background
pw attach tw-XXXXXX                            # session name is printed by the test run
pw -s=tw-XXXXXX step-over                      # also: pause-at <file:line>, resume, snapshot
```

## Exploring APIs

Use `page.request` through `run-code` in a headless session, and confirm request shape, status codes, response schema, auth and error payloads:

```bash
pw -s=<feature-slug> open about:blank
pw -s=<feature-slug> --raw run-code "async page => { const r = await page.request.get('<url>'); return { status: r.status(), headers: r.headers(), body: await r.json() }; }"
```

`post`, `put`, `patch` and `delete` work the same way, for example `page.request.post('<url>', { data: {...} })`. Check the failure cases too (missing auth, invalid payload, unknown id), and never assume an endpoint exists. Send state-changing requests only to a test environment; if that's unclear, ask the user first. For traffic a page sends itself, use `requests` and `request <n>`.

## Evidence

- **Planning** writes `docs/exploration/<feature-slug>-exploration.md`: the commands run, the Playwright code they printed, observed values and API responses, and the final locator per element. Saved snapshots go beside it as `docs/exploration/<feature-slug>-<state>.yml`. This is reference material, not test code; it gets refactored into page objects and specs.
- **Review** doesn't write exploration files. It leaves CLI output in `.playwright-cli/` and quotes what matters in the review report.
- **Secrets:** CLI output can contain what was typed or returned. Before saving anything to `docs/`, replace credentials and tokens with their env var names. Save storage state only under `.playwright-cli/` (gitignored), e.g. `state-save .playwright-cli/<feature-slug>-storage-state.json`.
