#!/usr/bin/env node
// Converts plain text to Unicode "Mathematical Sans-Serif Bold" characters, the bold style
// LinkedIn posts use for the series title line, section headings and key terms (LinkedIn
// has no native bold). Only A–Z, a–z and 0–9 are converted; spaces, punctuation and other
// characters pass through unchanged.
//
// Usage:
//   node .ai/skills/write-linkedin-learning-post/scripts/bold.mjs "The tradeoff"
//   echo "The tradeoff" | node .ai/skills/write-linkedin-learning-post/scripts/bold.mjs

import { readFileSync } from 'node:fs';

const BOLD_UPPER_A = 0x1d5d4;
const BOLD_LOWER_A = 0x1d5ee;
const BOLD_DIGIT_0 = 0x1d7ec;

const toBold = (text) =>
  text.replace(/[A-Za-z0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    if (char >= 'A' && char <= 'Z') return String.fromCodePoint(BOLD_UPPER_A + code - 65);
    if (char >= 'a' && char <= 'z') return String.fromCodePoint(BOLD_LOWER_A + code - 97);
    return String.fromCodePoint(BOLD_DIGIT_0 + code - 48);
  });

const input = process.argv.length > 2 ? process.argv.slice(2).join(' ') : readFileSync(0, 'utf8').replace(/\n$/, '');
if (input.trim().length === 0) {
  console.error('ERROR: no text given. Usage: bold.mjs "text to make bold"');
  process.exit(2);
}

console.log(toBold(input));
