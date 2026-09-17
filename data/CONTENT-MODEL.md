# Content model

Puzzles come from two places: **templates applied to entities** (the bulk), and
**hand-authored one-offs** (the interesting superlatives). Both land in the same
`puzzles.json` shape and both obey SOURCING.md.

## Puzzle types

- `ranked` — ten slots ordered by a pinned metric. "Largest countries by total
  area." Needs the full rule set: metric, margin, ambiguity disclosure.
- `recency` — the ten most recent instances of a repeating event, slots labelled
  by year/edition. "Ten most recent winners of the Boston Marathon, men's."
  No metric to dispute, so rules 1, 5 and 6 are trivially satisfied; what
  matters instead is edition coverage and the next-edition date.

## Templates

A template plus an entity list generates many puzzles. Recorded on each puzzle
as `generator: { template, entity }` so a whole family can be re-verified or
retired together.

| Template | Entity source | Rough yield |
|---|---|---|
| 10 most recent winners of X | Olympic events (S ~330, W ~110, by sex) | 250+ |
| 10 most recent champions of X | League titles, majors, slams, F1, grand tours, marathon majors | 150+ |
| 10 most recent champions of X | Domestic top-flight leagues and national cups, by country | 300+ |
| 10 most recent champions of X | NCAA championships (~90 across 24 sports, men's and women's) | 150+ |
| 10 most recent recipients of X | MVPs, Ballon d'Or, Heisman, player-of-year awards | 50+ |
| 10 most recent winners of X | Best Picture, Nobel (6), Pulitzer (many), Booker, Eurovision | 60+ |
| 10 most recent hosts of X | Olympics, World Cup, Euros, Super Bowl | 15+ |

Domestic leagues and college sports are where the catalogue stops being
countable — nearly every country with a top flight has ten years of champions,
and NCAA publishes championship histories for two dozen sports in both sexes.
They are also almost entirely obscurity 4–5, which is precisely why the
obscurity filter below is load-bearing rather than a nice-to-have.

### Entity qualification for `recency`

An entity qualifies only if:
- It has **at least 10 completed editions**. Forty years of Olympiads excludes
  many events, women's events especially — filter per entity, don't assume.
- Editions are **uninterrupted enough** to be fair. Gaps (wartime, 2020 COVID
  postponements, boycotts) are fine but must be reflected in the slot labels,
  since a player counting back by fours will otherwise be misled.
- The winner is **a single unambiguous name**. Team events need a stated
  convention (country? club? both?) recorded in `metric`.

No expiry and no recheck. The puzzle states its `asOf` date in the prompt, which
keeps it true indefinitely: a new edition makes the list older, not wrong. If a
family ever feels dated enough to be worth refreshing, the `generator` field
lets the whole family be re-pulled in one pass — but nothing forces it.

## Curation: obscurity

Supply is effectively unlimited, so selection is the real problem. Impeccable
sourcing does not make a puzzle worth playing — "ten most recent winners of the
women's 10m air rifle" is perfectly sourced and of no interest to most players.

Every puzzle carries `obscurity` 1–5:

1. Common knowledge — World Cup winners, Best Picture
2. Follows the news — F1 champions, Ballon d'Or
3. Knows the sport/field — grand tour winners, Booker Prize
4. Enthusiast — individual Olympic events in major disciplines
5. Specialist — minor Olympic events, niche categories

The app filters on this, and it is the lever that keeps an infinite catalogue
from becoming an infinite catalogue of things nobody wants to play.
