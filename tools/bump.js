#!/usr/bin/env node
/*
 * Bumps the cache version in sw.js.
 *
 * This matters more than it looks. The browser only checks for a new service
 * worker by byte-comparing sw.js, so if a deploy changes index.html but leaves
 * sw.js identical, no new worker installs, no controllerchange fires, and the
 * auto-reload in index.html never runs — the update waits for the next cold
 * launch instead of arriving immediately. Bumping the version on every deploy
 * is what keeps that chain intact.
 *
 * Usage: node tools/bump.js
 */
const fs = require('fs');
const path = require('path');

const SW = path.join(__dirname, '..', 'sw.js');
const src = fs.readFileSync(SW, 'utf8');
const m = src.match(/const CACHE = '([a-z-]+)-v(\d+)';/);
if (!m) { console.error('could not find the CACHE version in sw.js'); process.exit(1); }

const next = +m[2] + 1;
fs.writeFileSync(SW, src.replace(m[0], `const CACHE = '${m[1]}-v${next}';`));
console.log(`sw.js cache: ${m[1]}-v${m[2]} -> ${m[1]}-v${next}`);
