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

**Weighted ADR** on the Open Positions bar is the other side of open heat. Heat is what a bad day
costs if every stop hits; this is what an ordinary day *moves* when nothing goes wrong — each
position's share of equity times its own ADR, summed, with the dollar figure beside it. Shorts count
on absolute value. A position with no ADR set can only drag it down, so the number of those is
stated next to it rather than left silent.

**Survival levers**, deliberately outside per-trade sizing: a max open heat cap in R across the book,
and a cold-streak brake on the last five closes. Both **flag and do not block** — the heat breach
appears on the book bar *and* under the Open trade button, and the wording says plainly that the
decision stays yours. A warning that claims to stop you and then doesn't is worse than no warning.

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

## Fast calc

The Desk carries a **Fast calc**: price, stop, tier, share count. No ticker, no concept, no
checklist, and nothing recorded. It is the question the calculator exists to answer, with nothing in
front of it.

Long or short is inferred from which side the stop sits, so that is one less field to touch. In a
group it breaks down per account. It honours buying power exactly as New Trade does, so the number
you get is the number you would get by committing.

When you are filled, **Send to New Trade** carries the price, stop, side and tier across and puts the
cursor in the ticker field. Correct the entry to your actual fill and open it. That way you size
before the order and record after it, without typing the same trade twice.

## Buying power

R answers how much you may **lose**. It says nothing about how much you may **hold** — and a tight
stop makes those two wildly different. A $1,000 risk unit against a 50c stop is 2,000 shares; at $100
a share that is a $200,000 position on a $100,000 account.

Each account carries a margin setting: **Cash** (1x), or 2x, 4x, 6x. Buying power is equity times
that multiple, and open positions consume it at their current mark. Sizing takes the **smaller** of
what R allows and what buying power allows, and says so plainly when the second one binds — including
what fraction of an R you are actually taking as a result. The book bar carries buying power used
across whatever is in view, amber past 80% and red at 100%.

This is a ceiling, not a broker calculation. There are no maintenance requirements, no per-security
haircuts, no overnight-versus-intraday distinction. Your broker remains the authority on what you can
actually borrow.

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

A refresh covers **every open position in every account**, not just the tab you are on: a mark is a
fact about a ticker, and a position left unmarked elsewhere quietly falsifies its P/L, its heat and
the buying power it is consuming. Requests are deduplicated by symbol, so four accounts holding one
name costs one call, not four.

## Your data

`localStorage`, this browser, this origin, under the key `rcalc.v1`. Clearing site data wipes it, and
a different browser or machine will not see it. Use **Export / Download .json** to back up and to
move between machines.

Three things guard it:

**A failed save is loud.** If storage is full or blocked, a red banner says so and stays until a save
succeeds, with a button that dumps your whole book into the export box without touching storage. The
alternative — carrying on silently — leaves the screen correct and the disk empty, and you find out
at the next reload.

**Backups are chased.** Six days after your last Download or Copy, an amber label appears on the Desk
header. "Export to box" does not count: it puts the JSON on screen without it leaving the page.

**Import asks first.** Replacing a non-empty book states what will be discarded and what is arriving.
The box holds the *incoming* data at that moment, not a copy of yours, so take a Download first.

Every saved book carries a schema version (`v`), so future changes to the format can migrate rather
than guess.

## Prices and money

Three scales, because one rule cannot serve all three:

| | Shown as | Used for |
|---|---|---|
| **Equity** | whole dollars | portfolio value, buying power |
| **Money** | always cents | risk, cost, position value, P/L, an R in dollars |
| **Price** | up to 4 decimals | quotes, stops, risk per share, daily range |

Cents on a six-figure balance are noise and cost a column of width on every row. The fourth decimal
on a price is the opposite: at 1.1155 against a 1.1125 stop, risk per share is $0.003, and rounding
to cents prints that as $0.00 and sizes the trade off nothing.

Computed stops (breakeven, the 1R trail) snap to the tick implied by *the price you typed for that
trade*: enter at 110.25 and you get cent stops, enter at 1.1155 and you keep four decimals. A flat
four-decimal rule would hand you 110.2563, which no broker will accept.

## No Side field

There is no long/short control. The stop says which way you are trading — below the entry is a long,
above it a short — and Fast calc has always read it that way, so New Trade does too. A direction you
can set independently of your stop is a direction you can set wrong, silently, and then size against.

The inferred side shows as a LONG/SHORT pill on the sizing answer, so it is never a guess you cannot
see. Entry and stop at the same price is the one combination refused, because that is the only one
that carries no direction at all.

## What the tally and charts measure

**R multiple** is realised P/L over the R unit the trade locked at open.

**% of equity** divides by the AUM the trade was sized against, not today's AUM.

**Clearing data** asks twice and dumps your whole book into the export box first, so a mis-click is
recoverable as long as you have not left the page.

## Win rate, three ways

One question — how often did a trade actually win — asked three times, each stricter than the last.
There is no loss rate here on purpose.

| | Counts as a win | Out of |
|---|---|---|
| **Raw** | anything above zero | every closed trade |
| **Ex-scratch** | above +0.10R | every closed trade |
| **&ge;1R** | +1R or better � paid for a full loss | every closed trade |

All three share one denominator � every closed trade � so they read as one idea tightened twice
rather than three separate samples. Nothing is excluded; a scratch simply is not a win.

The scratch band is **-0.05R to +0.10R**, wider on the positive side so a bad fill on a breakeven stop
still reads as the scratch it is. The middle rate is the useful one day to day: it counts the trades
that actually returned something, which makes its shortfall against the raw rate a measure of the
time and buying power spent on setups that went nowhere.

Read it against **avg days held: winners vs losers**. If the raw rate is high, the &ge;1R rate is low,
*and* winners are held shorter than losers, that is cutting winners early confirmed from two
independent directions. A low &ge;1R rate is not automatically wrong � only if it contradicts how you
meant to trade.

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
trade button. It looks across **every account**, not just the one in view, and names the account the
loss was in — the rule follows the taxpayer rather than the book, and a loss in one account against a
re-entry in another is the case that gets missed. Into an IRA it is the expensive one: the disallowed
loss is not deferred, it is gone. It is a flag and nothing more: no lots, no adjusted basis, no attempt to reproduce what
your broker's 1099-B already does correctly. It does not block the trade. Worth heeding for two
reasons — the disallowed loss, and the fact that a fast re-entry into a name that just beat you is
often revenge rather than a setup.

## Accounts and groups

Tabs at the top of the desk are separate **accounts** — separate equity, separate R unit, separate
trade log. A single `Trading` account comes as the default.

A **group** is one ruleset laid over several accounts. It carries a leading dot in the tab strip and
opens out into a box holding its members. What the group owns: R %, tier budgets, the heat cap and
the cold-streak brake. What each account keeps: its equity, its positions, and every statistic.

Enter a trade once in a group and each account sizes it off its **own** equity, so the share counts
differ while the risk stays one R everywhere.

One order across several accounts rarely fills at one price, so the entry table carries a **Fill**
column: a per-account price, blank meaning "the shared entry above."

It does not resize anything. Size is settled before the order goes in — off the shared entry, in Fast
calc or here — and a fill arriving three cents away is not a reason to take two fewer shares. What
the fill sets is the price the trade is **recorded** at, and with it the cost and the allocation.

That matters more than the share count. Every closed-trade statistic reads back the entry price — R
multiple, P/L, the three win rates, days held against outcome — so booking four legs at one price
when three filled elsewhere puts a permanent error into each of them. On a tight stop a few cents is
a few hundredths of an R, which is enough to move a trade across the scratch band and into a
different win-rate bucket.

A fill on the far side of the stop is flagged amber, since it is nearly always a typo, but it still
opens: the fill is yours to state. The target ladder stays quoted off the shared entry and says so.

Tick boxes on the entry form let you skip an account
for a single trade, and any account too small to take one share at that stop is named and skipped
rather than silently dropped.

Mid-trade, one set of controls drives every leg — marks, stops, adds, trims, closes — each computed
on that account's own numbers. Adds take each account's own maximum; trims broadcast as a percentage,
never a share count. Click a member inside the group box to work in it alone: close one leg early to
raise cash, take a different fill, update equity after a deposit.

Deleting a group keeps every account and trade; each member takes a copy of the ruleset so its open
trades keep sizing against the numbers they were opened under.

---

Built from a memoir. Not affiliated with, endorsed by, or reviewed by its author.
This is a calculator, not financial advice.
