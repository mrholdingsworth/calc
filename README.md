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

## Your data

`localStorage`, this browser, this origin. Clearing site data wipes it, and a different browser or
machine will not see it. Use **Export / Download .json** to back up and to move between machines.

## Multiple books

Tabs at the top of the desk are separate portfolios — separate AUM, separate R unit, separate trade
log. A single `Trading` book comes as the default; add or delete your own.

---

Built from a memoir. Not affiliated with, endorsed by, or reviewed by its author.
This is a calculator, not financial advice.
