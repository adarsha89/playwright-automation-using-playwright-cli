---
name: write-linkedin-learning-post
description: Turn concrete, verifiable lessons found in a code repository (code, tests, config, docs, history) into a clear LinkedIn post centred on what was learned — not a project announcement. Picks one main lesson, grounds every claim in repository evidence, continues or proposes a learnings series only when it fits, and ends with the code repository link, then one specific question, then 3–5 relevant hashtags. Saves the post as a validated, paste-ready plain-text file (≤ 3,000 characters). Use when asked to create, improve, or plan a LinkedIn post about a repo.
---

# write-linkedin-learning-post

Turns a repository's real engineering lessons into a reviewable LinkedIn post draft. The post
teaches something the reader can use; the repository is the evidence, not the subject being sold.

This skill is tool-agnostic. "Ask the user" means use your environment's question UI if it has
one, otherwise ask in plain text; when running without a human, return the questions instead
of guessing. This skill **never publishes** anything and never claims a post was published.

## Inputs

Use what the user already gave; ask only for what materially changes accuracy or voice.

| Input | Needed? | If missing |
|---|---|---|
| Repository (path or current working tree) | Required | Ask |
| Topic/angle the user wants (a feature, bug, decision, "surprise me") | Optional | Choose from evidence and say why |
| Author's role and involvement (built it, reviewed it, maintains it, studied it) | Required for any first-person claim | Ask; until answered, write in a neutral/observational voice ("In this repo…", "The team…") |
| Personal experience/outcomes (time saved, bug impact, how it felt) | Only if the post will state them | Ask; never invent |
| Intended audience (e.g. SDETs, frontend devs, engineering managers) | Recommended | Assume from the repo's domain and state the assumption |
| Series history (previous posts, title, numbering) | Only if a series is wanted | Check the repo (see Series handling), then ask |
| Permission to share details publicly (private/employer repos) | Required when the repo isn't clearly public | Ask; meanwhile keep details generic |
| Tone/length preferences | Optional | Default: concise, professional, ~150–250 words |

## Workflow

### 1. Inspect the repository — not just the README

Build an evidence list before choosing a lesson. Look at, as available:
- **Code**: core modules, abstractions, helpers, and comments explaining *why* something is done.
- **Tests**: what's tested, how, and any unusual patterns (fixtures, tagging, data builders, mocks).
- **Configuration**: build/lint/test/CI config, env handling, version pins, and comments on them.
- **Documentation**: README, contributor/AI instruction files, ADRs, plans, reports, changelogs,
  "learnings"/"gotchas" notes (in this repo: `.ai/context/*.md`, `docs/**`).
- **History** (if a VCS is available): commit messages, messages that mention fixes, reverts,
  or "why", and files that changed together. E.g. `git log --oneline -50`, `git log -p -- <file>`.

Never quote or reveal secrets, tokens, credentials, private hostnames, customer data, or `.env`
values, even as examples.

### 2. Identify concrete, supportable lessons

List 3–5 candidates. Prefer, in order:
1. Surprising details or debugging insights (a failure that looked like one thing but was another).
2. Specific engineering decisions and the tradeoff behind them.
3. Patterns that solved a real, visible problem in this code.
Reject generic advice ("write clean code", "tests matter") unless the repo shows a specific,
non-obvious form of it.

For each candidate, record: the lesson in one sentence, the evidence (`path:line`, commit hash,
or doc section), whether it is **observed** (directly in the repo) or **inferred** (your
interpretation), and who would care.

### 3. Ground every claim

- State only what the evidence supports. No invented implementation details, metrics, outcomes,
  timelines, team sizes, authorship, or personal feelings.
- Mark inferences as such in the evidence list, and soften them in the post ("this suggests…").
- Any first-person claim ("I spent two days…", "we cut flakiness by 40%") needs the user's
  confirmation. If it isn't confirmed, rewrite it neutrally or ask.

### 4. Choose one main lesson

Pick the candidate with the strongest evidence and the clearest reader payoff. Secondary lessons
may appear only in support of it (at most one or two short mentions). Everything in the post
should serve the main lesson.

### 5. Series handling

1. **Look for an existing series**: previous drafts in the repo (e.g. `docs/linkedin-posts/`,
   or files/commits mentioning "LinkedIn", "post", "series", "Part", "#"), plus anything the user
   shared. If found, continue its exact title, label format and numbering (next number), and
   match its structure.
2. **No series found**: if the repo clearly holds several distinct lessons worth sharing, suggest
   a series title and a *tentative* label in the form `<Topic> framework, Learning N` (e.g.
   "Playwright framework, Learning 1"), shown as the bold title line (step 7).
   Never imply earlier parts exist; ask the user to confirm the numbering.
3. **Series would feel forced** (single lesson, one-off topic): write a standalone post and say so.
4. **Learning 2 or later — recap the previous post and state this one (mandatory).** When the
   post's learning number is greater than 1, it must briefly say what the previous post
   (Learning N−1) covered **and, right after it, what this post's learning is**, so new readers
   get the thread and returning readers see how the series moves on.
   - **Source the recap, never invent it.** Read the previous post's paste-ready `.txt` in
     `docs/linkedin-posts/` (the highest earlier learning number or latest date in the same series);
     use its main lesson — in its `.md` review notes if present, otherwise from the hook and
     lesson paragraph. If no previous post is found, ask the user what Learning N−1 covered (or for
     its text/link); running non-interactively, leave a `[Recap of Learning N−1: …]` placeholder in the
     `.txt` and list it under "Assumptions and questions" — the validator will pass, so flag it
     clearly.
   - **Keep it short**: two sentences in one paragraph, each ~15–30 words, naming each lesson
     plainly, in the form `Previously, in Learning N−1: <previous lesson>. In Learning N:
     <this post's main lesson>.` (e.g. "Previously, in Learning 1: Cucumber pays off when people
     outside the code read the scenarios, and adds overhead for engineer-only checks. In
     Learning 2: page objects should return Locators, not counts or booleans, so assertions keep
     retrying."). Mention only the immediately previous part, not the whole series.
   - **The current-learning sentence** states the same main lesson chosen in step 4 as a
     one-line takeaway — not a teaser, and not a restatement of the hook's wording. The body
     then explains and evidences it.
   - **Placement**: its own paragraph after the hook and intro line, and before the first bold
     section heading (never before the hook — it must stay above "…see more").
   - The recap supports the main lesson; it doesn't count as a second lesson and gets no
     takeaways of its own. The recap paragraph is not a heading and gets no bold. Add a row for it in the Evidence table pointing to the previous post
     file (or "confirmed by user").

### 6. Draft

Structure (adapt, don't force):
1. **Title line** (series posts only): the bold series label — see step 7.
2. **Hook** (1–2 lines): a specific, accurate tension, surprise or result from the evidence.
   No clickbait, false stakes, or "You won't believe…". Optionally one short intro line after it.
3. **Previous-part recap + current learning** (Learning 2+ only, one paragraph of two
   sentences): what the last post covered, then what this post teaches — see step 5.4.
4. **Sectioned body** under 2–4 bold headings (step 7), e.g. 𝗧𝗵𝗲 𝗽𝗿𝗼𝗯𝗹𝗲𝗺 (the situation in
   the code, only as much as the reader needs), 𝗪𝗵𝗮𝘁 𝘁𝗵𝗲 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 𝗱𝗼𝗲𝘀 / the lesson and *why
   it matters*, 𝗪𝗵𝘆 … 𝗯𝗲𝗮𝘁𝘀 𝘁𝗵𝗲 𝗮𝗹𝘁𝗲𝗿𝗻𝗮𝘁𝗶𝘃𝗲𝘀 (optional `→` list), 𝗧𝗵𝗲 𝘁𝗿𝗮𝗱𝗲𝗼𝗳𝗳. Pick headings
   that fit the lesson; takeaways (2–4 bullets, optional) must be actionable and supported by
   the repo.
5. **Code repository link**: its own paragraph right before the question, in the form
   `Code repository: <bare public URL>` (e.g.
   `Code repository: https://github.com/adarsha89/playwright-test-automation`). Get the URL from
   `git remote get-url origin`, converting an SSH remote (`git@github.com:owner/repo.git`) to
   `https://github.com/owner/repo` and dropping a trailing `.git`. Never invent or guess a URL:
   if there is no remote, or the repo may be private and sharing permission isn't confirmed,
   ask the user for the public link (non-interactive: stop and return the question).
6. **Question**: one specific, easy-to-answer question tied to the main lesson that invites
   readers' own experience, opinion or approach (e.g. "How do you keep locators stable when a
   third-party page keeps adding headings?"). Not "Thoughts?" or "Agree?".
7. **Hashtags**: after the question, usually 3–5, specific to the topic and engineering practice
   (e.g. `#Playwright #TestAutomation #TypeScript #SDET`). No broad/unrelated tags, no piles.

Voice: natural, credible, professional; short paragraphs (1–3 sentences); plain words; code
identifiers in the text only when they help. At most one or two emojis, or none. Avoid
"thought leadership" filler ("In today's fast-paced world", "game-changer", "Here's the thing").
A series label, if any, is the bold title line (step 7) — never mixed into the hook.

### 7. Format for LinkedIn

LinkedIn posts are plain text: Markdown is **not** rendered, so `**bold**`, `# headings`,
backticks, `[text](url)` links and tables show up as literal characters. Write the post body
so it reads correctly when pasted as-is:
- **Above the fold**: only the first ~2–3 lines (roughly 200 characters) show before "…see more".
  The hook — and series label, if any — must land there on its own.
- **Line breaks**: one idea per paragraph, separated by a blank line. No walls of text.
- **Lists**: plain-text markers such as `•`, `→`, `-` or `1.` at the start of a line; keep items
  to one line where possible.
- **Formatted headings (Unicode bold)**: LinkedIn has no native bold, so the post uses Unicode
  "Mathematical Sans-Serif Bold" characters (𝗹𝗶𝗸𝗲 𝘁𝗵𝗶𝘀) — and only that style — in exactly
  three places:
  1. **Title line** (series posts): the first line of the post is the series label in bold, e.g.
     `𝗣𝗹𝗮𝘆𝘄𝗿𝗶𝗴𝗵𝘁 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸, 𝗟𝗲𝗮𝗿𝗻𝗶𝗻𝗴 𝟮`, followed by a blank line and then the hook.
     Standalone posts have no title line and start with the hook.
  2. **Section headings**: after the hook/intro, split the body into 2–4 short sections, each
     starting with a bold heading of 2–6 words on its own line (e.g. `𝗧𝗵𝗲 𝗽𝗿𝗼𝗯𝗹𝗲𝗺`,
     `𝗪𝗵𝗮𝘁 𝘁𝗵𝗲 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 𝗱𝗼𝗲𝘀`, `𝗪𝗵𝘆 <X> 𝗯𝗲𝗮𝘁𝘀 𝘁𝗵𝗲 𝗮𝗹𝘁𝗲𝗿𝗻𝗮𝘁𝗶𝘃𝗲𝘀`, `𝗧𝗵𝗲 𝘁𝗿𝗮𝗱𝗲𝗼𝗳𝗳`). Sentence
     case, no trailing colon or period. The heading's first paragraph starts on the **very next
     line** (no blank line between heading and text); a blank line goes *before* each heading.
     The hook, intro, recap, question and hashtags never get a heading.
  3. **Key phrases** (optional): at most 3 short inline bold phrases per post, ≤ 4 words each —
     the identifier or concept the lesson hinges on (e.g. `𝗣𝗲𝗻𝗱𝗶𝗻𝗴𝗘𝘅𝗰𝗲𝗽𝘁𝗶𝗼𝗻`), a list item's
     label (`3. 𝗗𝗿𝘆 𝗿𝘂𝗻 (…). Every Gherkin line…`), or the answer in a rule-of-thumb list
     (`→ Technical and framework checks: 𝗽𝗹𝗮𝗶𝗻 𝘁𝗲𝘀𝘁 𝗰𝗼𝗱𝗲.`) — never whole sentences.
  Generate the characters with the bundled converter instead of typing them —
  `node .ai/skills/write-linkedin-learning-post/scripts/bold.mjs "The tradeoff"` — so every
  letter is in the right style. Screen readers and LinkedIn search handle these characters
  poorly, which is why bold stays on short labels and never carries the lesson's only statement
  of something. Never use other Unicode styles (italic, script, monospace, double-struck).
- **Other emphasis**: no Markdown. Emphasise through wording or a short standalone line; CAPS
  sparingly (one or two words, if at all).
- **Code**: no code blocks. Mention identifiers inline as plain text (optionally in quotes, e.g.
  "level: 1") and keep them short. If a snippet is essential, suggest attaching it as an image
  or carousel and say so in "Assumptions and questions" rather than pasting it into the text.
- **Links**: paste bare URLs only (LinkedIn auto-links them) and only public ones. If the user
  cares about reach, mention the option of putting other links in the first comment instead.
  The code repository link (step 6, item 5) always stays in the post, just before the question.
- **Mentions**: @-mentions of people/companies only work when typed in LinkedIn's editor; leave
  a placeholder like `[@mention Name]` and flag it rather than a plain `@Name`.
- **Hashtags**: on the final line, after the question, separated by spaces, CamelCase for
  multi-word tags (`#TestAutomation`), no punctuation inside a tag.
- **Length**: LinkedIn caps posts at 3,000 characters; stay well under it (the ~150–250 word
  default is roughly 1,000–1,600 characters). This is validated in step 9 — don't estimate it.

### 8. Write the paste-ready post file (mandatory)

Always save the post as a plain-text file the user can open, select all, copy and paste straight
into LinkedIn's editor with no clean-up:

`docs/linkedin-posts/<YYYY-MM-DD>-<topic-slug>.txt`

The file contains **only the post text** — no front matter, headings, notes, evidence, fences or
labels — and follows these rules:
- **Encoding**: UTF-8 without BOM, LF (`\n`) line endings, ending with a single newline.
- **Paragraphs**: each paragraph on **one line** — never hard-wrap at a column width, because
  LinkedIn keeps every line break and a wrapped paragraph shows up broken mid-sentence on the
  post. Exactly one blank line between paragraphs; no leading/trailing blank lines.
- **Blank lines keep their breaks**: LinkedIn's editor drops truly empty lines on paste (and
  on publish), so paragraphs, headings and the hashtag line run together. Every blank separator
  line therefore contains exactly one invisible U+2800 BRAILLE PATTERN BLANK (`⠀`) and nothing
  else, which LinkedIn keeps as a visible blank line. Don't type it: write the file with normal
  empty lines, then run
  `node .ai/skills/write-linkedin-learning-post/scripts/keep-breaks.mjs <file.txt>` (idempotent;
  re-run after every edit). Each separator counts as 1 character toward the limit.
- **Lists**: one item per line, starting with `•`, `→`, `-` or `1.`, with no blank lines between
  items of the same list.
- **Whitespace**: no trailing spaces, no tabs, no indentation.
- **Plain text only**: no Markdown; Unicode sans-serif bold only in the three places allowed in
  step 7 (title line, section headings, ≤ 3 key phrases).
- **Headings**: a blank line before each bold heading line and none after it — the section's
  text starts on the next line.
- **Ending**: the `Code repository: <URL>` line as its own paragraph, then a blank line, then
  the question as its own paragraph (optionally followed by a single 👇), then a
  blank line, then one final line with only the 3–5 hashtags separated by single spaces.

Example layout (`¶` marks a blank separator line, which holds a single `⠀` in the file after
`keep-breaks.mjs` runs). Reference post in this
style: `SeleniumCucumberFramework/docs/linkedin-posts/pending-is-a-third-outcome-post.txt`.

```text
𝗣𝗹𝗮𝘆𝘄𝗿𝗶𝗴𝗵𝘁 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸, 𝗟𝗲𝗮𝗿𝗻𝗶𝗻𝗴 𝟮
¶
Hook line with the specific surprise or result.
¶
One short intro line that frames the lesson.
¶
Previously, in Learning 1: <one-sentence recap of the previous post>. In Learning 2: <one-sentence statement of this post's lesson>.
¶
𝗧𝗵𝗲 𝗽𝗿𝗼𝗯𝗹𝗲𝗺
The situation in the code, in one or two sentences.
¶
𝗪𝗵𝗮𝘁 𝘁𝗵𝗲 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 𝗱𝗼𝗲𝘀
What was done, naming the 𝗸𝗲𝘆 𝘁𝗲𝗿𝗺 once.
¶
𝗪𝗵𝘆 𝗶𝘁 𝗯𝗲𝗮𝘁𝘀 𝘁𝗵𝗲 𝗮𝗹𝘁𝗲𝗿𝗻𝗮𝘁𝗶𝘃𝗲𝘀
→ Alternative one: why it falls short.
→ Alternative two: why it falls short.
¶
𝗧𝗵𝗲 𝘁𝗿𝗮𝗱𝗲𝗼𝗳𝗳
The honest cost or limit of the approach.
¶
Code repository: https://github.com/<owner>/<repo>
¶
One specific question for readers? 👇
¶
#Playwright #TestAutomation #TypeScript
```

When improving an existing post or making user-requested edits, overwrite the same `.txt` file.
If the user didn't ask for a file on disk and you are only able to reply in chat, still produce
the exact file content in the "Post" block and say where it would be saved.

### 9. Validate the post file (mandatory)

LinkedIn rejects posts over **3,000 characters**, counting everything in the post text: letters,
spaces, line breaks, emojis, the question and the hashtags. Don't eyeball or estimate the count
or the formatting — run the bundled validator on the `.txt` file:

```bash
node .ai/skills/write-linkedin-learning-post/scripts/validate-post.mjs docs/linkedin-posts/<YYYY-MM-DD>-<topic-slug>.txt
```

It checks the 3,000-character limit (emojis and other non-BMP characters count as 2, erring on
the safe side) and the file rules from step 8: CRLF/BOM, leading/trailing/double blank lines,
trailing whitespace, empty separator lines that aren't `⠀` (run `keep-breaks.mjs` first), tabs, Markdown fences/headings/bold/links/backticks/tables/`*` bullets,
Unicode styling outside sans-serif bold, bold that isn't a title line/heading (≤ 8 words on its
own line) or one of ≤ 3 inline phrases of ≤ 4 words, a blank line straight after a heading, a question
present, a `Code repository: https://…` paragraph directly before the question, and a final line
of 3–5 hashtags only.

- Exit code `0` / `PASS` → valid. Exit code `1` / `FAIL` → fix every listed issue. If it's over
  the limit, shorten the post (cut secondary points, takeaways or context first — never the hook,
  question or hashtags). Re-run until it passes; never present a post that failed.
- The script can't detect hard-wrapped paragraphs — check that yourself (each paragraph is one
  line).
- No Node.js available? Fall back to `wc -m < <file>` with a UTF-8 locale (subtract 1 for the
  trailing newline), check the step 8 rules manually, and state in "Assumptions and questions"
  that the fallback was used.
- Re-validate after **every** edit to the post text, including edits asked for by the user.
- Report the result in the output's "Length" section (see Output format).

### 10. Refine and self-check

Run the quality checks below, fix what fails (re-running step 9 after any text change), then
present the output.

## Output format

Always write the paste-ready `docs/linkedin-posts/<YYYY-MM-DD>-<topic-slug>.txt` (step 8). Then
return the review notes below; if the user asks for them on disk or you're running
non-interactively, also save them as `docs/linkedin-posts/<YYYY-MM-DD>-<topic-slug>.md` (same
basename as the `.txt`):

````markdown
## Series
<"<Series title>, Learning N" | "Suggested: <title>, Learning 1 (tentative)" | "Standalone">
<Learning 2+ only: "Previous post: <path to Learning N−1 .txt | user-provided> — <its main lesson>">

## Post
File to copy: docs/linkedin-posts/<YYYY-MM-DD>-<topic-slug>.txt
Copy to clipboard: pbcopy < docs/linkedin-posts/<YYYY-MM-DD>-<topic-slug>.txt
(Windows: clip < <file>; Linux: wl-copy < <file> or xclip -selection clipboard < <file>)

```text
<exact content of the .txt file (plain text, formatted per steps 7–8),
ending with the question, then the hashtags>
```

## Length
<N> / 3000 characters, formatting OK — PASS (validated with validate-post.mjs | wc -m fallback)

## Evidence
| Claim in post | Evidence (path:line / commit / doc section) | Observed or inferred |

## Assumptions and questions for you
- <assumption made and why> / <question that would change accuracy or voice>

## Alternates (only when useful)
- Alternate hooks (max 2) or a shorter/longer variant
````

Default to one concise draft. Offer alternates only when the choice genuinely matters (e.g. two
equally strong hooks, or the user asked).

## Quality checks

- [ ] Main focus is a lesson learned from the code, not a project/product announcement.
- [ ] Exactly one main lesson; secondary points support it.
- [ ] Every factual claim maps to a row in the Evidence table; inferences are worded as such.
- [ ] No invented metrics, outcomes, authorship or personal experience; first-person claims are user-confirmed.
- [ ] No secrets, credentials, private URLs, customer data or confidential details; sharing permission considered.
- [ ] Hook is specific and accurate; no clickbait.
- [ ] Short paragraphs; readable on mobile; roughly 150–250 words unless the user asked otherwise.
- [ ] Post is paste-ready plain text: no Markdown syntax, code blocks or tables; hook fits above "…see more".
- [ ] Formatted headings per step 7: bold title line for series posts, 2–4 short bold section headings each followed directly by its text, ≤ 3 short bold key phrases, all generated with `scripts/bold.mjs` (sans-serif bold only).
- [ ] Post saved as `docs/linkedin-posts/<date>-<slug>.txt` containing only the post text: one line per paragraph (no hard wraps), one blank line between paragraphs, hashtags alone on the last line (step 8).
- [ ] `scripts/keep-breaks.mjs` ran on the final `.txt`, so every blank separator line is a single `⠀` (U+2800) and the line breaks survive pasting into LinkedIn.
- [ ] `scripts/validate-post.mjs` (step 9) PASSED on the final `.txt` (≤ 3,000 characters, formatting OK); the count is reported in the "Length" section.
- [ ] Takeaways (if any) are actionable and supported by the repo.
- [ ] Ends with the `Code repository: <public URL>` paragraph (real URL from the git remote or the user, never invented), **then** one specific, answerable question tied to the lesson, **then** 3–5 relevant hashtags.
- [ ] Minimal emojis; no generic filler phrases.
- [ ] Series label follows existing numbering, is marked tentative, or is omitted — never implies non-existent parts.
- [ ] Learning 2 or later: one paragraph "Previously, in Learning N−1: …. In Learning N: …." (previous lesson, then this post's main lesson) after the hook/intro and before the first heading, with the recap sourced from the previous post file or the user (never invented), with an Evidence row (step 5.4).
- [ ] Nothing was published, and the response doesn't claim it was.
