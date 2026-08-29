# R Calculator

A position-sizing and trade-management calculator built around **R**: a fixed percentage of portfolio
value that serves as the risk unit for every trade. Reconstructed from the `cal.xlsx` described in
Simon Russo's six-part memoir at [simon-russo.com](https://www.simon-russo.com/).

One self-contained `index.html`. No build step, no dependencies, no server, no accounts.
Everything is stored in your browser's `localStorage`.

## The math

Everything derives from one number:

```
1R = AUM × R%
```

`1R` recomputes from live AUM, so it scales as you compound. **Each trade locks its own R unit
at the moment it opens** — later AUM changes never retroactively resize an open sequence.

**Sizing.** Budget is `1R × tier multiple`. Shares are `floor(budget ÷ risk-per-share)`,
where risk-per-share is the distance from entry to the stop. Widen the stop and the share count
falls to hold dollar risk constant. That is the whole point: width is free.

**Constant-risk pyramiding.** At every add, the calculator recomputes from scratch rather than stacking risk:

```
max add = (budget + realized − risk-of-current-position-at-the-new-stop) ÷ (new risk per share)
```

Booked profit expands the budget, so trimming into strength finances the next add. Tightening the
stop on a signal frees size. Doing neither frees nothing — *no signal → no stop move → no add.*

**B/E mode** sets the budget term to zero, so only banked profit finances adds: worst case on the
whole sequence becomes a scratch.

**Sequence at stop** is `risk-at-stop − realized`. When it goes negative the sequence cannot lose,
and the card flips to *house money*.

**ADR audit.** Enter an average daily range % and it reports how many normal days sit between price
and your stop. Under 1.0 is red, under 1.5 is amber: a stop inside ordinary noise converts correct
theses into losses that teach you nothing. It also tells you the stop and size that would buy 1.5 ADRs
of room at the same R.

**Survival levers**, deliberately outside per-trade sizing: a max open heat cap in R across the book,
and a cold-streak brake on the last five closes.

## Running it

Open `index.html` in a browser. That is the whole install.

### Hosting it on GitHub Pages (free)

1. Create a new **public** repository named `calc`.
2. Commit `index.html` to the default branch (`.nojekyll` is optional — this site has no
   underscore-prefixed paths, so Jekyll has nothing to trip over).
3. **Settings → Pages → Source: Deploy from a branch**, pick `main` and `/ (root)`.
4. It goes live at `https://mrholdingsworth.github.io/calc/` in a minute or two.

The repository name is what sets the last part of that address. The name of the folder on your own
machine is unrelated to it and can stay whatever it is.

The repo has to be public for Pages to serve it on the free plan. What that publishes is the app
itself and nothing else — your trades never enter the repo, and there is no account, key, or
personal data in the file. Serving from a private repo needs a paid plan.

## Marks and staleness

A **mark** is simply the last price you have given the app for an open position. It is set whenever
you use Set on Mark / last price, add, trim, or close — and by a live refresh if you have a key.

A mark goes **stale after 24 hours of wall-clock time**. That threshold exists because everything on
an open card is derived from it: open P/L, book P/L, open heat, the sequence-at-stop figure and the
daily volatility check. A day-old price quietly makes all of them wrong. Past 24h the trade card
labels the age in amber, past 72h in red, and the Refresh marks button on the Open Positions header
turns amber and counts how many positions are affected.

It is wall-clock, not trading days, so a Friday mark reads stale by Saturday afternoon even though
nothing has traded. Treat the weekend flag as noise.

### Live marks (optional)

Paste a free [Finnhub](https://finnhub.io/register) API key under **Data Management** to pull last
prices for open tickers. Refreshes on demand from the Open Positions header and once a minute,
holding off while you have a field focused. Without a key everything else works — set marks by hand.
A mark only ever moves the last price: never a stop, a size, or a decision.

## Your data

`localStorage`, this browser, this origin. Clearing site data wipes it, and a different browser or
machine will not see it. Use **Export / Download .json** to back up and to move between machines.

## What the tally and charts measure

**R multiple** is realised P/L over the R unit the trade locked at open.

**% of equity** divides by the AUM the trade was sized against, not today's AUM.

**Clearing data** asks twice and dumps your whole book into the export box first, so a mis-click is
recoverable as long as you have not left the page.

## The 30-day review

A month after a close, the market has answered a question your exit could not: did it keep running
without you, or did the exit hold up? Every closed trade carries a **30-day review** field for that,
beside the immediate re-trade note.

Once 30 days have passed with the field still empty the row takes a gold rail and a gold dot, and the
count appears in the section header — visible even with the section collapsed. Writing anything
clears it. The same badge is mirrored on the Desk header, so the queue is visible from the top of the
page whatever else is folded away. The two failures this is built to surface are cutting winners
early and being shaken out of something that went on to work; neither is visible on the day you close.

## Wash-sale flag

Naming a ticker you closed at a loss within the last 30 days raises an amber line under the Open
trade button. It is a flag and nothing more: no lots, no adjusted basis, no attempt to reproduce what
your broker's 1099-B already does correctly. It does not block the trade. Worth heeding for two
reasons — the disallowed loss, and the fact that a fast re-entry into a name that just beat you is
often revenge rather than a setup.

## Multiple books

Tabs at the top of the desk are separate portfolios — separate AUM, separate R unit, separate trade
log. A single `Trading` book comes as the default; add or delete your own.

---

Built from a memoir. Not affiliated with, endorsed by, or reviewed by its author.
This is a calculator, not financial advice.
