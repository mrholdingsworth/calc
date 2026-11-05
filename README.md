# RCalculator

A trade journal and portfolio tracker built around **R**: one fixed fraction of the account is the
risk unit, and every size, result and statistic is measured in it. The position-sizing calculator it
started as is still there for when it helps.

One self-contained `index.html`. No build step, no dependencies, no server, no accounts. Your book
lives in your browser's `localStorage` (key `rcalc.v2`) and nowhere else, so download a backup from
the Data tab regularly.

| | URL | file |
|---|---|---|
| The app | <https://mrholdingsworth.github.io/calc/> | `index.html` |
| Review a shared book | <https://mrholdingsworth.github.io/calc/review/> | `review/index.html` → `/calc/?review` |
| Old v2 address | <https://mrholdingsworth.github.io/calc/v2.html> | forwards to `/calc/` |
| v1.3, parked for reference | <https://mrholdingsworth.github.io/calc/_parked/v1.3.html> | `_parked/v1.3.html` (key `rcalc.v1`) |

## Getting started

The app opens with a **Read me** the first time; it is in Settings any time after. Before entering
anything, fit **Settings** to your account: initial capital, R as a percentage of AUM, the tier
multiples, margin, and the allocation limits. Every number the app produces is measured against them.

## The core idea

```
1R = AUM × R%            AUM = cash + every open position valued at its stop
```

A trade's result in R is what it realised over the account's 1R when it opened. Internal R is the
same result over what that position was built to lose at its first stop. Unrealised gains never
count as assets: a gain on screen is the one a trader starts protecting at the expense of a trailing
stop, so there is no net liq anywhere.

Nothing blocks a trade from opening. Open heat, the cold-streak brake, allocation limits and
unstopped shares are flagged, never enforced.

## What is in it

- **Portfolio** — open positions, Buy / Sell / Stop, the gear for history and corrections,
  dividends, marks, cash in and out.
- **New Trade** — ticker, fill, shares and stop; R and allocation worked out.
- **Closed Trades** and **Statistics** — results in R, 30-day reviews, loss tags, filters.
- **Audit** — a thinkorswim Transaction History CSV checked against the book, changes applied only
  when ticked; and a filterable ledger of every transaction.
- **Calendar** (click the clock) — realised P/L by day and a daily journal.
- **Data** — export, import, and a coaching export for an AI to review a span of trades.

## The review page

`/calc/review/` opens the app empty, asks for a JSON export to load, and saves nothing: close the
tab and it is gone. It is for looking at someone else's book without touching your own.

## Development

Edit `index.html` directly. `_dev/v2-checks.js` holds the regression checks (`runChecks()`), run from
a gitignored probe copy built as its header describes; `_dev/compare.js` is the historical
v1.3-equivalence harness. Decisions are recorded in `V2-PLAN.md` and `OPEN-ITEMS.md`;
`SESSION-HANDOFF.md` is the orientation for picking the work up.

Not financial advice.
