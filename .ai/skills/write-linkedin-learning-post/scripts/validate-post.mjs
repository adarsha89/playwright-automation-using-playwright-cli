#!/usr/bin/env node
// Validates a paste-ready LinkedIn post text file: LinkedIn's 3,000-character limit plus the
// formatting rules from the skill's "Format for LinkedIn" step (plain text, with Unicode
// sans-serif bold only for the title line, 2–4 section headings and ≤ 3 short inline phrases).
//
// Usage:
//   node .ai/skills/write-linkedin-learning-post/scripts/validate-post.mjs <file.txt> [--max 3000]
//   cat post.txt | node .ai/skills/write-linkedin-learning-post/scripts/validate-post.mjs
//
// The file must contain only the post text, exactly as it will be pasted into LinkedIn.
// Newlines, spaces, emojis and hashtags all count. The larger of the Unicode code-point count
// and the UTF-16 length is checked, so emojis and other astral characters count as 2.
//
// Blank separator lines must contain exactly one U+2800 BRAILLE PATTERN BLANK ("⠀"), not be
// empty: LinkedIn drops empty lines on paste. scripts/keep-breaks.mjs converts them.
//
// Exit codes: 0 = valid, 1 = over the limit or formatting errors, 2 = usage/input error.

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const maxIndex = args.indexOf('--max');
const max = maxIndex === -1 ? 3000 : Number(args[maxIndex + 1]);
const file = args.find((arg, i) => !arg.startsWith('--') && (maxIndex === -1 || i !== maxIndex + 1));

if (!Number.isInteger(max) || max <= 0) {
  console.error('ERROR: --max must be a positive integer.');
  process.exit(2);
}

let raw;
try {
  raw = readFileSync(file ?? 0, 'utf8');
} catch (error) {
  console.error(`ERROR: cannot read ${file ?? 'stdin'}: ${error.message}`);
  process.exit(2);
}

// A single trailing newline (added by most editors) is not part of the pasted post.
const post = raw.replace(/\n$/, '');
if (post.trim().length === 0) {
  console.error('ERROR: post text is empty.');
  process.exit(2);
}

const lines = post.split('\n');
const BLANK = '\u2800';
const isBlank = (line) => line.trim() === '' || line.trim() === BLANK;
const errors = [];
const check = (condition, message) => condition && errors.push(message);
const linesMatching = (pattern) =>
  lines.flatMap((line, i) => (pattern.test(line) ? [i + 1] : [])).join(', ');
const lineCheck = (pattern, message) => {
  const found = linesMatching(pattern);
  check(found !== '', `${message} (line ${found})`);
};

check(raw.includes('\r'), 'Windows line endings (CRLF) — save with LF line endings.');
check(raw.startsWith('﻿'), 'Byte-order mark at start of file — save as UTF-8 without BOM.');
check(isBlank(lines[0]), 'Leading blank line(s) — the hook must be the first line.');
check(isBlank(lines.at(-1)), 'Trailing blank line(s) after the hashtags.');
check(
  lines.some((line, i) => i > 0 && isBlank(line) && isBlank(lines[i - 1])),
  'More than one blank line in a row — use exactly one between paragraphs.',
);
lineCheck(
  /^[ \t]*$/,
  'Empty line — LinkedIn drops it on paste and merges the paragraphs; run scripts/keep-breaks.mjs to use a "⠀" (U+2800) separator',
);
lineCheck(/^(?=.*\u2800)(?!\u2800$)/, 'U+2800 blank mixed with other text — it must be alone on a separator line');
lineCheck(/[ \t]+$/, 'Trailing whitespace');
lineCheck(/\t/, 'Tab character — use spaces or a list marker');
lineCheck(/^```/, 'Markdown code fence — LinkedIn shows it literally');
lineCheck(/^#{1,6}\s/, 'Markdown heading — LinkedIn shows the # literally');
lineCheck(/\*\*[^*]+\*\*|__[^_]+__/, 'Markdown bold — LinkedIn shows the markers literally');
lineCheck(/\[[^\]]+\]\([^)]+\)/, 'Markdown link — paste the bare URL instead');
lineCheck(/`[^`]+`/, 'Backtick code span — write the identifier as plain text');
lineCheck(/^\s*\|.*\|\s*$/, 'Markdown table row — LinkedIn has no tables');
lineCheck(/^\s*[*+]\s/, 'Markdown list marker (* or +) — use •, →, - or 1.');
lineCheck(
  /(?![\u{1D5D4}-\u{1D607}\u{1D7EC}-\u{1D7F5}])[\u{1D400}-\u{1D7FF}]/u,
  'Unicode italic/script/monospace/other styled letters — only sans-serif bold (scripts/bold.mjs) is allowed',
);

// Sans-serif bold is allowed only as the title line, section headings, and ≤ 3 short inline phrases.
const BOLD = /[\u{1D5D4}-\u{1D607}\u{1D7EC}-\u{1D7F5}]/u;
const PLAIN_ALNUM = /[A-Za-z0-9]/;
const isBoldLine = (line) => BOLD.test(line) && !PLAIN_ALNUM.test(line);
const wordCount = (line) => line.trim().split(/\s+/).length;
let headings = 0;
let inlineBoldPhrases = 0;
lines.forEach((line, i) => {
  const n = i + 1;
  const prevBlank = i === 0 || isBlank(lines[i - 1]);
  const nextBlank = i + 1 >= lines.length || isBlank(lines[i + 1]);
  if (isBoldLine(line)) {
    check(wordCount(line) > 8, `Bold line ${n} is ${wordCount(line)} words — keep titles/headings to ≤ 8.`);
    check(/[:.]\s*$/.test(line), `Bold heading on line ${n} ends with ":" or "." — drop it.`);
    if (i === 0) {
      check(!nextBlank, 'Title line (line 1) must be followed by a blank line, then the hook.');
    } else {
      headings += 1;
      check(!prevBlank, `Heading on line ${n} needs a blank line before it.`);
      check(nextBlank, `Heading on line ${n} must be followed directly by its text (no blank line).`);
    }
  } else if (BOLD.test(line)) {
    // A phrase is a run of consecutive words containing bold characters.
    const runs = line
      .split(/\s+/)
      .map((word) => (BOLD.test(word) ? 'b' : '.'))
      .join('')
      .match(/b+/g);
    for (const run of runs) {
      inlineBoldPhrases += 1;
      check(run.length > 4, `Inline bold phrase on line ${n} is ${run.length} words — keep it to ≤ 4.`);
    }
  }
});
check(inlineBoldPhrases > 3, `${inlineBoldPhrases} inline bold phrases — bold at most 3 outside the title/headings.`);
check(headings === 1 || headings > 4, `${headings} section heading(s) — use 2–4 bold headings.`);
check(headings === 0, 'No bold section headings — add 2–4 (generate them with scripts/bold.mjs).');

const lastLine = lines.at(-1).trim();
check(!/^#\w/.test(lastLine), 'Last line should be the hashtags (e.g. "#Playwright #TestAutomation").');
const hashtags = lastLine.match(/#[\p{L}\p{N}_]+/gu) ?? [];
check(hashtags.length > 0 && (hashtags.length < 3 || hashtags.length > 5), `${hashtags.length} hashtags — use 3–5.`);
check(
  hashtags.length > 0 && lastLine.split(/\s+/).some((word) => !/^#[\p{L}\p{N}_]+$/u.test(word)),
  'Hashtag line should contain only hashtags separated by spaces (no punctuation inside a tag).',
);
check(
  !lines.some((line) => /\?\s*(\p{Extended_Pictographic}\s*)*$/u.test(line)),
  'No question found — end with one specific question.',
);
const questionLine = lines.findLastIndex((line) => /\?\s*(\p{Extended_Pictographic}\s*)*$/u.test(line));
check(
  questionLine !== -1 && !/^Code repository: https?:\/\/\S+$/.test(lines[questionLine - 2] ?? ''),
  'Missing "Code repository: <URL>" paragraph directly before the question.',
);

// Learning 2+ recap: "Previously, in Learning N−1: …. In Learning N: …." in one paragraph.
lines.forEach((line, i) => {
  const recap = line.match(/^Previously, in Learning (\d+):/);
  if (!recap) return;
  const current = line.match(/\. In Learning (\d+): \S/);
  check(
    !current,
    `Recap on line ${i + 1} must also state this post's learning: "… In Learning ${Number(recap[1]) + 1}: <lesson>."`,
  );
  check(
    current && Number(current[1]) !== Number(recap[1]) + 1,
    `Recap on line ${i + 1}: "In Learning ${current?.[1]}" should be Learning ${Number(recap[1]) + 1}.`,
  );
});

const count = Math.max([...post].length, post.length);
check(count > max, `${count} / ${max} characters — over by ${count - max}. Shorten the post.`);

if (errors.length > 0) {
  console.error(`FAIL: ${file ?? 'stdin'}`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`PASS: ${count} / ${max} characters, formatting OK (${file ?? 'stdin'}) — ${max - count} remaining.`);
