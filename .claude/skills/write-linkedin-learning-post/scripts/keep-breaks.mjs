#!/usr/bin/env node
// Makes a LinkedIn post file keep its paragraph breaks when pasted into LinkedIn's editor.
// LinkedIn drops truly empty lines on paste/publish, merging the paragraphs around them, so
// every empty line is replaced with a single U+2800 BRAILLE PATTERN BLANK ("⠀"): an invisible
// character that LinkedIn keeps, so the line survives as a visible blank line. Also strips
// trailing whitespace and CRLF. Idempotent: safe to re-run after every edit.
//
// Usage:
//   node .ai/skills/write-linkedin-learning-post/scripts/keep-breaks.mjs <file.txt>

import { readFileSync, writeFileSync } from 'node:fs';

const BLANK = '⠀';

const file = process.argv[2];
if (!file) {
  console.error('ERROR: no file given. Usage: keep-breaks.mjs <file.txt>');
  process.exit(2);
}

let raw;
try {
  raw = readFileSync(file, 'utf8');
} catch (error) {
  console.error(`ERROR: cannot read ${file}: ${error.message}`);
  process.exit(2);
}

const lines = raw
  .replace(/^﻿/, '')
  .replace(/\r\n?/g, '\n')
  .replace(/\n+$/, '')
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/, ''));
const out = lines.map((line) => (line.trim() === '' || line.trim() === BLANK ? BLANK : line));
const replaced = out.filter((line, i) => line === BLANK && lines[i] !== BLANK).length;

writeFileSync(file, `${out.join('\n')}\n`, 'utf8');
console.log(`OK: ${replaced} empty line(s) replaced with U+2800 blank separators (${file}).`);
