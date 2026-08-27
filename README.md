# Cal — R Calculator

A position-sizing and trade-management calculator built around **R**: a fixed percentage of portfolio
value that serves as the risk unit for every trade. Reconstructed from the `cal.xlsx` described in
Simon Russo's six-part memoir at [simon-russo.com](https://www.simon-russo.com/).

One self-contained `index.html`. No build step, no dependencies, no server, no accounts.
Everything is stored in your browser's `localStorage`.

## The four buttons

The original spreadsheet, per the memoir, was four buttons in a grid. This keeps that spine:

| | | |
|---|---|---|
| **01 · Position size** | R ÷ risk per share | The entry sizer. Tier and stop in, share count out. |
| **02 · Stop level** | invalidation, not comfort | Ratchet, breakeven stop, 1R trail, ADR noise audit. |
| **03 · Target** | decided before entry | R-multiple price ladder, plan hinges, exit written down. |
| **04 · Tally** | what the record says | Expectancy, R distribution, loss discipline, noise-stopout audit. |

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

**Constant-risk pyramiding.** At every add, Cal recomputes from scratch rather than stacking risk:

```
max add = (budget + realized − risk-of-current-position-at-the-new-stop) ÷ (new risk per share)
```

Booked profit expands the budget, so trimming into strength finances the next add. Tightening the
stop on a signal frees size. Doing neither frees nothing — *no signal → no stop move → no add.*

**B/E mode** sets the budget term to zero, so only banked profit finances adds: worst case on the
whole sequence becomes a scratch.

**Sequence at stop** is `risk-at-stop − realized`. When it goes negative the sequence cannot lose,
and the card flips to *house money*.

**ADR audit.** Enter an average daily range % and Cal reports how many normal days sit between price
and your stop. Under 1.0 is red, under 1.5 is amber: a stop inside ordinary noise converts correct
theses into losses that teach you nothing. It also tells you the stop and size that would buy 1.5 ADRs
of room at the same R.

**Survival levers**, deliberately outside per-trade sizing: a max open heat cap in R across the book,
and a cold-streak brake on the last five closes.

## Running it

Open `index.html` in a browser. That is the whole install.

### Hosting it on GitHub Pages (free)

1. Create a new repository — say `cal`.
2. Commit `index.html` and `.nojekyll` to the default branch.
3. **Settings → Pages → Source: Deploy from a branch**, pick your branch and `/ (root)`.
4. It goes live at `https://<your-username>.github.io/cal/` in a minute or two.

Make the repo private if you'd rather it not be public — GitHub Pages on a private repo requires a
paid plan, so for free hosting the repo must be public. Nothing in the file contains your data:
trades live only in your browser, never in the repo.

## Live marks (optional)

Paste a free [Finnhub](https://finnhub.io/register) API key into the desk to pull last prices for
open tickers, refreshed every minute. Without a key everything still works — mark prices by hand.
The key is stored in your browser and used only for requests you trigger.

## Your data

`localStorage`, this browser, this origin. Clearing site data wipes it, and a different browser or
machine will not see it. Use **Export / Download .json** to back up and to move between machines.

## Multiple books

Tabs at the top of the desk are separate portfolios — separate AUM, separate R unit, separate trade
log. `trading` and `main` come as defaults; add or delete your own.

---

Built from a memoir. Not affiliated with, endorsed by, or reviewed by its author.
The rules panel is paraphrase, not scripture — go read the source. This is a calculator,
not financial advice.
