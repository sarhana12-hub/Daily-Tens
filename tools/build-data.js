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
const APP = path.join(__dirname, '..', 'index.html');

/*
 * Load the app's real matching code, rather than a copy of it.
 *
 * An alias hole is the failure mode this project keeps hitting — "Manning"
 * and "Yellow" were both rejected mid-game — and it will recur with every
 * batch of content. So the audit has to run at build time, and it has to run
 * against the code that actually ships. Re-implementing the matcher here
 * would drift within a week and start passing guesses the app rejects, which
 * is worse than no audit at all.
 */
function loadMatcher() {
  const src = fs.readFileSync(APP, 'utf8');
  const m = src.match(/=== MATCHER START[\s\S]*?===\s*\*\/([\s\S]*?)\/\* === MATCHER END/);
  if (!m) {
    console.error('Could not find the MATCHER markers in index.html. The audit cannot run against stale code, so this is fatal.');
    process.exit(1);
  }
  const api = {};
  new Function('exports', m[1] + '\nexports.norm = norm; exports.resolveGuess = resolveGuess; exports.answerAliases = answerAliases; exports.derivedAliases = derivedAliases; exports.WEAK = WEAK;')(api);
  return api;
}

/*
 * Every sovereign country, used to prove that no real country name is ever
 * absorbed into a *different* country.
 *
 * This is the one failure the alias audit could not see: it only tries
 * shorthands derived from the answers, so it never typed "Chile" at a list
 * containing China. Fuzzy matching bridged them and swallowed a correct,
 * distinct answer without telling the player. Being rejected costs a heart;
 * being silently absorbed costs an answer they knew.
 */
const COUNTRIES = `Afghanistan Albania Algeria Andorra Angola Argentina Armenia Australia Austria Azerbaijan
Bahamas Bahrain Bangladesh Barbados Belarus Belgium Belize Benin Bhutan Bolivia Botswana Brazil Brunei
Bulgaria Burkina Faso|Burundi Cambodia Cameroon Canada Chad Chile China Colombia Comoros Congo
Costa Rica|Croatia Cuba Cyprus Denmark Djibouti Dominica Ecuador Egypt El Salvador|Eritrea Estonia
Eswatini Ethiopia Fiji Finland France Gabon Gambia Georgia Germany Ghana Greece Grenada Guatemala
Guinea Guyana Haiti Honduras Hungary Iceland India Indonesia Iran Iraq Ireland Israel Italy Jamaica
Japan Jordan Kazakhstan Kenya Kiribati Kuwait Kyrgyzstan Laos Latvia Lebanon Lesotho Liberia Libya
Liechtenstein Lithuania Luxembourg Madagascar Malawi Malaysia Maldives Mali Malta Mauritania Mauritius
Mexico Moldova Monaco Mongolia Montenegro Morocco Mozambique Myanmar Namibia Nauru Nepal Netherlands
New Zealand|Nicaragua Niger Nigeria Norway Oman Pakistan Palau Panama Paraguay Peru Philippines Poland
Portugal Qatar Romania Russia Rwanda Samoa Senegal Serbia Seychelles Sierra Leone|Singapore Slovakia
Slovenia Somalia Spain Sudan Suriname Sweden Switzerland Syria Tajikistan Tanzania Thailand Togo Tonga
Tunisia Turkey Turkmenistan Tuvalu Uganda Ukraine Uruguay Uzbekistan Vanuatu Venezuela Vietnam Yemen
Zambia Zimbabwe`.split(/[\s|]+/).filter(Boolean).reduce((acc, w) => {
  // Re-join the two-word names that were split on whitespace.
  const TWO = { Burkina: 'Faso', Costa: 'Rica', El: 'Salvador', New: 'Zealand', Sierra: 'Leone' };
  if (acc.pending) { acc.out.push(acc.pending + ' ' + w); acc.pending = null; return acc; }
  if (TWO[w]) { acc.pending = w; return acc; }
  acc.out.push(w);
  return acc;
}, { out: [], pending: null }).out;

// No real country may resolve to a different country.
function auditCountryCollisions(M, puzzles) {
  const fatal = [];
  for (const p of puzzles) {
    const answers = p.answers.map(a => ({ name: a.name, aliases: M.answerAliases(a.name, a.aliases || []) }));
    const own = new Set(answers.map(a => M.norm(a.name)));
    // Only meaningful for lists whose answers are countries.
    const countryish = answers.filter(a => COUNTRIES.some(c => M.norm(c) === M.norm(a.name))).length;
    if (countryish < 5) continue;
    for (const c of COUNTRIES) {
      const r = M.resolveGuess(c, answers);
      if (!r.names.length) continue;                       // correctly rejected
      if (own.has(M.norm(c)) && r.names.length === 1 && r.names[0] === M.norm(c)) continue;  // itself
      if (own.has(M.norm(c))) continue;                    // ambiguity, handled by asking
      // A deliberate alias is fine: typing "Congo" at a list holding DR Congo
      // credits the answer that IS there, which gives the player a slot rather
      // than taking one. Only a fuzzy bridge between distinct names is fatal.
      const hit = answers.find(a => M.norm(a.name) === r.names[0]);
      if (hit && [hit.name, ...(hit.aliases || [])].some(f => M.norm(f) === M.norm(c))) continue;
      fatal.push(`${p.id}: "${c}" is not on this list but resolves to ${r.names.join(' / ')} — a real, different answer would be swallowed`);
    }
  }
  return fatal;
}

// Every shorthand a player might type for this answer, as the app would see it.
function candidatesFor(M, a) {
  const cands = new Set([a.name, ...(a.aliases || []), ...M.answerAliases(a.name, a.aliases || [])]);
  for (const w of M.norm(a.name).split(' ')) {
    if (w.length >= 4 && !M.WEAK.has(w)) cands.add(w);
  }
  return [...cands].filter(Boolean);
}

// Returns { fatal: [...], notes: [...] }.
function auditAliases(M, puzzles) {
  const fatal = [], notes = [];
  for (const p of puzzles) {
    const answers = p.answers.map(a => ({
      name: a.name,
      aliases: M.answerAliases(a.name, a.aliases || []),
    }));
    p.answers.forEach((a, ai) => {
      for (const guess of candidatesFor(M, a)) {
        const r = M.resolveGuess(guess, answers);
        if (!r.names.length) {
          fatal.push(`${p.id} / ${a.name}: "${guess}" is REJECTED — a player typing it loses a heart`);
        } else if (r.names.length > 1) {
          notes.push(`${p.id}: "${guess}" matches ${r.names.length} answers — the app will ask which`);
        } else if (M.norm(r.names[0]) !== M.norm(a.name)) {
          const other = answers.find(x => M.norm(x.name) === r.names[0]);
          const otherName = other ? other.name : r.names[0];
          // A guess that IS another answer's exact name belongs to that answer.
          // "germany" is West Germany's derived shorthand but Germany's actual
          // name, and giving the player Germany is right: it's on the list, so
          // nothing is lost. Only a genuine misdirection is fatal.
          if (M.norm(otherName) === M.norm(guess)) {
            notes.push(`${p.id}: "${guess}" is shorthand for ${a.name} but the exact name of ${otherName} — resolves to ${otherName}`);
          } else {
            fatal.push(`${p.id} / ${a.name}: "${guess}" resolves to the WRONG answer (${otherName})`);
          }
        }
      }
    });
  }
  return { fatal, notes: [...new Set(notes)] };
}

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

  // A ranked list with values must actually be in rank order. Easy to get
  // wrong when authoring by hand, and invisible until a player notices the
  // numbers don't descend.
  // `order: "asc"` for metrics where smaller is better — star magnitude runs
  // backwards, and so do finishing times.
  if (p.type === 'ranked' && p.answers.every(a => a.value != null)) {
    const asc = p.order === 'asc';
    for (let i = 1; i < p.answers.length; i++) {
      const prev = p.answers[i - 1].value, cur = p.answers[i].value;
      if (asc ? cur < prev : cur > prev) {
        problems.push(`${p.id}: #${i + 1} (${p.answers[i].name}, ${cur}) outranks #${i} (${p.answers[i - 1].name}, ${prev})`);
      }
    }
  }
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

// Alias audit, against the app's own matching code.
const M = loadMatcher();
const audit = auditAliases(M, src.puzzles);
problems.push(...audit.fatal);
problems.push(...auditCountryCollisions(M, src.puzzles));

if (problems.length) {
  console.error('Refusing to build:\n  ' + problems.join('\n  '));
  process.exit(1);
}

if (audit.notes.length) {
  console.log('Ambiguous guesses (handled — the app asks the player to be specific):');
  for (const n of audit.notes) console.log('  ' + n);
}

fs.writeFileSync(OUT, JSON.stringify({ schemaVersion: src.schemaVersion, obfuscated: true, puzzles }));
console.log(`built ${OUT} — ${puzzles.length} puzzles, ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`);
