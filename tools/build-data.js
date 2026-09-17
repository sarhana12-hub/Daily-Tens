#!/usr/bin/env node
/*
 * Builds data/puzzles.min.json from data/puzzles.json.
 *
 * Answer names and aliases are XOR'd with a fixed key and base64'd. This is
 * NOT encryption and is not meant to be: with no server, anything the app can
 * decode a determined reader can decode too. The point is narrower — someone
 * sent a puzzle link shouldn't be able to spoil it by glancing at the network
 * response or the DOM, which is exactly what dailytens.com lets you do.
 *
 * Usage: node tools/build-data.js
 */
const fs = require('fs');
const path = require('path');

const XKEY = 'tens';
const SRC = path.join(__dirname, '..', 'data', 'puzzles.json');
const OUT = path.join(__dirname, '..', 'data', 'puzzles.min.json');

function ob(str) {
  const utf8 = Buffer.from(String(str), 'utf8').toString('binary');
  let x = '';
  for (let i = 0; i < utf8.length; i++) {
    x += String.fromCharCode(utf8.charCodeAt(i) ^ XKEY.charCodeAt(i % XKEY.length));
  }
  return Buffer.from(x, 'binary').toString('base64');
}

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const problems = [];

const puzzles = src.puzzles.map(p => {
  // Cheap guard against shipping a list that breaks SOURCING.md.
  if (p.answers.length !== 10) problems.push(`${p.id}: ${p.answers.length} answers, need 10`);
  if (!p.metric) problems.push(`${p.id}: no metric`);
  if (!p.source || !p.source.url) problems.push(`${p.id}: no source url`);
  if (!p.asOf) problems.push(`${p.id}: no asOf date`);
  if (!p.obscurity) problems.push(`${p.id}: no obscurity rating`);
  if (p.type === 'recency' && p.answers.some(a => !a.label)) problems.push(`${p.id}: recency answers need labels`);
  if (p.volatility && p.volatility !== 'evergreen' && p.margin && p.margin.gapPct < 5) {
    problems.push(`${p.id}: volatile list with only ${p.margin.gapPct}% tail margin (rule 5 needs >5%)`);
  }

  // Anything shown before the quiz ends must not give the game away. The
  // `ambiguity` note is exempt because the app withholds it until the end.
  const preGame = [p.prompt, p.metric].join(' ');
  const flat = s => ' ' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  const hay = flat(preGame);
  for (const a of p.answers) {
    const needle = flat(a.name);
    if (needle.trim().length >= 2 && hay.includes(needle)) {
      problems.push(`${p.id}: the prompt or metric names the answer "${a.name}" — that is a spoiler`);
    }
  }
  // A clue has to point at its answer without containing it, and without
  // giving away a different answer in the same list.
  const names = p.answers.map(a => flat(a.name));
  p.answers.forEach((a, ai) => {
    if (!a.clue) return;
    const c = flat(a.clue);
    const own = [a.name, ...(a.aliases || [])].filter(s => String(s).length >= 4);
    for (const s of own) {
      if (c.includes(flat(s))) problems.push(`${p.id} #${a.rank}: clue contains its own answer ("${s}")`);
    }
    // Other answers count by nickname too: "beat New England 29-13" gives away
    // the Patriots just as surely as spelling out the full franchise name.
    p.answers.forEach((other, ni) => {
      if (flat(other.name) === flat(a.name)) return;
      for (const form of [other.name, ...(other.aliases || [])]) {
        if (String(form).length < 4) continue;
        if (c.includes(flat(form))) {
          problems.push(`${p.id} #${a.rank}: clue names another answer ("${form}")`);
          return;
        }
      }
    });
  });

  // Repeat-count phrasing is an unasked-for hint: it tells the player a name
  // fills more than one slot before they have worked anything out.
  const hint = /appears?\s+(twice|three times|more than once)|appear\s+(twice|three times|more than once)|\b(two|three|four)\s+(men|women|teams?|franchises?|nations?|countries|players?|people)\s+appear/i;
  if (hint.test(preGame)) {
    problems.push(`${p.id}: the prompt or metric hints at repeated answers — drop that clause`);
  }

  return Object.assign({}, p, {
    margin: undefined,          // authoring metadata, not needed at runtime
    answers: p.answers.map(a => ({
      rank: a.rank,
      label: a.label,
      value: a.value,
      name: ob(a.name),
      // Obfuscated like the answers: a clue is hint content, and reading the
      // whole ladder out of the network response defeats the point of paying
      // for it a step at a time.
      clue: a.clue ? ob(a.clue) : undefined,
      aliases: (a.aliases || []).map(ob),
    })),
  });
});

if (problems.length) {
  console.error('Refusing to build:\n  ' + problems.join('\n  '));
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify({ schemaVersion: src.schemaVersion, obfuscated: true, puzzles }));
console.log(`built ${OUT} — ${puzzles.length} puzzles, ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`);
