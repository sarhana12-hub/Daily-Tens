#!/usr/bin/env node
/*
 * Sorts every ranked puzzle's answers by their own values and renumbers the
 * ranks to match.
 *
 * Authoring by hand, I kept writing correct values and then ordering the list
 * by reputation or by the order things came to mind — the rank-order guard has
 * caught over forty of these. Rather than fixing them one at a time, this
 * derives the order from the data, which is where it should have come from.
 *
 * `order: "asc"` puzzles sort the other way (magnitude, times, dates). Ties
 * keep their existing relative order, so a deliberate choice among equals
 * survives. Puzzles without values on every answer are left alone: their order
 * carries meaning the numbers don't (chronology, for instance).
 *
 * Usage: node tools/sort-ranks.js [--dry]
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'puzzles.json');
const dry = process.argv.includes('--dry');
const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));

let changed = 0;
for (const p of data.puzzles) {
  if (p.type !== 'ranked') continue;
  if (!p.answers.every(a => a.value != null)) continue;

  const before = p.answers.map(a => a.name).join('|');
  const dir = p.order === 'asc' ? 1 : -1;
  // Stable sort: Array.prototype.sort is stable in Node, so ties hold.
  p.answers = p.answers
    .slice()
    .sort((a, b) => (a.value === b.value ? 0 : (a.value - b.value) * dir));
  p.answers.forEach((a, i) => { a.rank = i + 1; });

  if (p.answers.map(a => a.name).join('|') !== before) {
    changed++;
    console.log(`  ${p.id}`);
  }
}

if (!dry) fs.writeFileSync(SRC, JSON.stringify(data, null, 2) + '\n');
console.log(`${changed} puzzle(s) reordered${dry ? ' (dry run, nothing written)' : ''}`);
