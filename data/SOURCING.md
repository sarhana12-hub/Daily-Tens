# Sourcing rules

A list ships only if it clears all six. No exceptions, no "close enough" —
the entire reason this app exists is that the original ships lists that don't.

1. **Pinned metric.** The metric string must be precise enough that the ten
   answers are fully determined by it, and it must be shown to the player.
   "Largest countries" is not a metric. "Total area including inland water,
   km²" is.

   Other sources disagreeing under a DIFFERENT definition is not a problem —
   it is expected, and it is not a reason to drop a list. The bar is a reliable
   source plus a question whose meaning is stated, not universal consensus.
   Definitional forks are a feature: "largest cities by city proper", "by
   metropolitan area" and "by urban agglomeration" are three good puzzles from
   one subject, not one contested puzzle to discard.

2. **One named source.** A single authoritative source per list, cited with a
   URL, that actually publishes the ranking or the underlying values. Never
   assembled by stitching several sources together, and never a listicle or an
   SEO aggregator. Prefer: statistical agencies, governing bodies, official
   registries, primary publishers.

3. **`asOf` date.** The date the cited source's data is valid for — not the
   date we looked it up. **Always shown to the player.**

   This is the whole staleness strategy: no benching, no expiry, no recurring
   re-verification. A dated list is not a wrong list, it is a list with a
   vintage, and saying so plainly is enough. For `recency` puzzles the date
   does more than disclaim — "the ten most recent winners as of March 2026" is
   a permanently true statement, so those puzzles never actually go wrong.

4. **Volatility tag** (optional, informational). `evergreen`, `annual` or
   `quarterly`. Records how fast a list moves so a future refresh pass can be
   prioritised. Nothing in the app acts on it.

5. **Tail margin.** The gap between #10 and #11, recorded as `margin`.
   - Evergreen: any margin is fine. A permanently-fixed 1% gap is still a
     correct ten forever.
   - Volatile: needs >5%, or the tail swaps between rechecks and the puzzle
     becomes unanswerable. This is the rule that disqualifies most
     "most-streamed" style lists.

6. **Documented ambiguity — shown only after the quiz ends.** If a well-known
   competing reading exists, record it in `ambiguity`. Players who know the
   subject well are the ones most likely to be "wrongly" rejected, and they
   deserve to see why. Never a disqualifier — and a competing reading worth
   documenting is usually also worth shipping as its own puzzle under its own
   pinned metric.

   **The note is post-game only.** To explain a rejection it has to name
   answers, so showing it mid-quiz hands over part of the list. The app
   withholds it until the game is over and says only that one exists.

## Nothing shown before the end may give the game away

`prompt` and `metric` are on screen from the first second, so they must not:

- **Name any answer.** Not even in passing, and not to justify the metric.
- **Hint at repeated answers.** "One franchise appears three times" is an
  unasked-for hint: it tells the player a name fills several slots before they
  have worked anything out, and it narrows the field. Let them discover it.

`tools/build-data.js` enforces both and refuses to build otherwise. The metric
still has to be pinned precisely — the constraint is to pin it *without*
leaking, which is always possible: define the measure, never the members.

## Answer matching

Every answer carries an `aliases` array, because a rejected-but-correct answer
is the single most infuriating failure mode. Cover: short forms, common
nicknames, official vs. colloquial names, and the obvious misspellings.
Matching is case-insensitive, punctuation- and diacritic-insensitive, and
fuzzy to a small edit distance — near-misses count.

## Difficulty is not obscurity

Two independent fields, both 1–5, both shown when a quiz opens.

**`obscurity`** — how likely a player is to care about the subject at all.
Required. Drives the rotation filters.

**`difficulty`** — how hard the ten are to complete *given* you follow the
subject. Optional, and an author estimate rather than a measurement: there is
no backend collecting scores, so it cannot be derived from play.

1 gentle · 2 straightforward · 3 testing · 4 hard · 5 brutal

They genuinely come apart, and conflating them is how you end up mis-setting a
filter. "Highest mountains in the world" is obscurity 2 and difficulty 5 —
everybody knows what a mountain is, almost nobody can name the eighth highest.
"The ten most recent US presidents" is obscurity 1 and difficulty 1. A low
obscurity cap makes the rotation *more relevant*, not easier.
