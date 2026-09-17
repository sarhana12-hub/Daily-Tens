# Deploying

```
node tools/build-data.js     # rebuild puzzles.min.json from puzzles.json
node tools/bump.js           # bump the sw.js cache version — do not skip
git add -A && git commit && git push
```

Live at https://sarhana12-hub.github.io/Daily-Tens/ about 40 seconds later.

## Why updates used to take ten minutes

Two separate delays, often confused:

1. **Pages build** — ~40s after a push. Never the ten-minute part.
2. **`Cache-Control: max-age=600`** — GitHub Pages stamps every file with a
   ten-minute browser cache and offers no way to override it on a static host.
   The new files were live at the URL; the browser just kept serving its own
   copy. Worse for an installed PWA: the service worker's own check for a new
   `sw.js` could read a *cached* `sw.js` and conclude nothing had changed.

## What makes it immediate

- `cache: 'no-store'` on every fetch inside `sw.js`, so nothing in the worker
  ever reads the ten-minute HTTP cache.
- `updateViaCache: 'none'` at registration, so the update check for `sw.js`
  bypasses it too. This is the one that actually fixes the ten minutes.
- `reg.update()` on load, forcing an immediate check.
- `reg.update()` again on every return to the foreground. Resuming a
  backgrounded home-screen app is not a page load, so without this an open app
  can sit stale indefinitely.
- Reload once on `controllerchange`, so an update applies without a
  force-quit — **deferred if a quiz is in progress**, then applied the moment
  the player leaves the game screen, so an update never costs a run.
- `tools/bump.js` on every deploy. The browser detects a new worker only by
  byte-comparing `sw.js`; a deploy that changes only `index.html` installs
  nothing, fires no `controllerchange`, and leaves the auto-reload dead.

## Verified (v5 → v6, on the live URL)

| Case | Result |
|---|---|
| Push → live at URL | 41s |
| App reopened | New version, old cache deleted |
| App resumed to foreground | Update check fires |
| Update lands mid-quiz | Deferred; score and progress kept |
| Player leaves game screen | Held update applies |
| App left open and idle | Stays put until foregrounded — by design |

## Authoring tools

```
node tools/sort-ranks.js     # derive rank order from the values
node tools/build-data.js     # validate everything, then build
node tools/bump.js           # bump the sw cache version
```

`sort-ranks.js` exists because authoring by hand, I repeatedly wrote correct
values and then ordered the list by reputation rather than by the number — the
rank-order guard caught over forty of these. Deriving the order from the data
removes the whole class. Run it before building.

It has one consequence: a clue that points at another slot by position ("the
same event as the third here") can be silently invalidated by a resort. The
build now refuses those, so clues must stand alone.
