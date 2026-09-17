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

## The alias audit and its blind spot

`tools/build-data.js` extracts the app's real matcher from `index.html` and
tries, for every answer, the full name, every listed alias, every derived
alias and every identifying word in the name. The build **fails** if any is
rejected or resolves to a different answer. Verified non-vacuous by sabotaging
the derivation: it caught five rejections immediately.

It can only test shorthands **derivable from the answer itself**. It cannot
know that "Huang He" means the Yellow River, that "EEAAO" means that film, or
that "Oakland" means a franchise now in Las Vegas. Those must be written down,
and a missing one will not fail the build.

So when authoring, add by hand:

- **City or region forms** for teams — "new england", "kansas city", "la".
- **Former names and cities** — "redskins", "oakland", "st louis rams".
- **Initialisms** — "psg", "kc", "nyg", "wft", "gsw".
- **First names** where they're used alone — "max", "lamar", "nole".
- **Bare nicknames** — "gunners", "dubs", "niners", "pack".
- **Non-English or alternative names** — "huang he", "kalaallit nunaat".
- **Both spellings** where they differ — "aluminium" and "aluminum".

Misspellings are handled by the matcher, not by aliases: optimal string
alignment (Levenshtein plus transpositions) at roughly one error per five
characters. "verstapen", "potasium", "ingebrigsten" and "antartic" all resolve.
Do not add typos as aliases.

## Never bend a real name into a different one

Fuzzy matching forgives typos. A typo is a string nobody meant to type — so a
guess that is itself a real name is taken at its word and matched only exactly.

The bug this prevents: "Chile" is two edits from "China", and a two-edit budget
on a five-letter word absorbed it, crediting China and telling the player
"already got China". They lost an answer they knew and were told nothing. The
same trap sits under Gambia and Zambia (one letter), Austria and Australia,
Niger and Nigeria, Slovakia and Slovenia, Iran and Iraq, Dominica and the
Dominican Republic.

Three defences, all needed:

1. **A protected vocabulary** in the matcher: every sovereign country. A guess
   matching one gets exact and alias matching only, never fuzzy. No tolerance
   setting alone can work — Gambia and Zambia differ by a single character.
2. **Tolerance from the shorter string**, so "austria" is budgeted as seven
   characters rather than "australia" as nine.
3. **A build audit** that types every country at every country list and fails
   the build if one resolves to a different country. It found eleven live
   instances of this bug the moment it was written.

A country name appearing *inside* an answer's own name is not this problem:
"Mount Kenya" should answer to "Kenya". The audit exempts exact aliases for
that reason.

## A weak puzzle is usually a weak metric

When a list feels unsourceable, the question is rarely the problem. "Fastest
birds" and "largest employers" are both perfectly good quiz questions. What
made them bad was my execution: one contained a bat, and the other never said
whether armies count.

So the repair order is:

1. **Pin the metric harder** until the ten is determinate. "Largest employers"
   is contestable; "largest private-sector employers" is not. "Largest flowers"
   is disputed; "largest blooms, flower heads and inflorescences" is answerable.
2. **Fix the answer set.** Remove anything that is not actually a member of the
   category, however widely it is quoted in other people's lists.
3. **Only then** write a confidence note, for whatever genuine imprecision is
   left.

A confidence note is not a licence to ship a wrong answer. That mistake was
made twice — coastal islands in a lake-islands list, a bat among the birds —
and both times the note described the error instead of correcting it.
