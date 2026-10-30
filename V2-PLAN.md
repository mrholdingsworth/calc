# Version 2 — implementation plan

Working plan for the v2 overhaul described in *Position Size Calculator — Version 2 Ideas*. Section
references like **I.A.2** point into that document's outline. This file is the build order and the
reasoning behind it; `OPEN-ITEMS.md` stays the backlog and decision record, and gets a Decided/done
entry per phase as usual.

The whole point of the shape below is the constraint Steve set: **v1.3 keeps working, live and
untouched, until v2 is finished.** Everything else is sequencing.

---

## 0. How v2 ships without touching v1

### Two files, both live

v2 is built as a **second file in the same repo**, `v2.html`, served at
`https://mrholdingsworth.github.io/calc/v2.html`. `index.html` continues to serve v1.3 at `/calc/`
and is not edited again until cutover.

Rejected alternatives, and why:

- **A `v2` branch.** Pages serves `main` only, so v2 would have no running copy. An app you cannot
  open in a browser cannot be tested, and half of these changes are layout.
- **One file behind a feature flag.** The v2 changes are structural — the saved data shape, the
  position renderer, where settings live. A flag would have to wrap nearly every function, and every
  v2 edit would sit one typo away from the file he is trading from.

### Separate storage, one-way import

Same origin means **the same `localStorage`**. If v2 wrote to `rcalc.v1`, v1.3 would load a book it
does not understand, and its `normalize()` would quietly drop the v2 fields and save — destroying v2
data on the next render. So v2 gets its own key, and the read-across machinery that already exists
does the rest:

```js
const KEY = "rcalc.v2";
const LEGACY_KEYS = ["rcalc.v1", "cal.v1"];   // read once if KEY is empty, never written
const SCHEMA = 2;
```

`load()` already reads a legacy key only when the current one is empty, leaves the old entry exactly
where it is, and raises the amber "your book was moved" banner. That is the behaviour wanted here
without modification, and it satisfies **IV.F** (v2 loads existing v1 books automatically).

The two books then diverge: trades taken live in v1 after the copy will not appear in v2. So v2's
Data Management gets a **Re-import from v1** button — re-read `rcalc.v1`, migrate, replace v2's
book — so v2 can be tested against current reality whenever he wants.

### v2's book is disposable until cutover

Consequence of the above, and it needs saying on the page rather than only here: **anything entered
into v2 before cutover is test data.** Cutover ends with a final re-import from v1, which overwrites
it. To stop a real trade being typed into the wrong tab:

- v2's masthead carries a loud `2.0-dev` badge and the version line reads `version | 2.0-dev`.
- One red line under the masthead: this is the development copy, its book is overwritten at cutover.
- v2 gets its **own** artifact URL. The v1.3 artifact
  (`https://claude.ai/artifact/NkoxRCYRTPZFrVwi1aAofb`) is not republished until cutover.

### Cutover (phase 11)

1. Final **Re-import from v1** in v2, and confirm the book reads correctly.
2. `git mv index.html _parked/v1.3.html`, `git mv v2.html index.html`.
3. Change `KEY` back to… **no** — leave it as `rcalc.v2`. The v1 book stays on `rcalc.v1` as a
   permanent fallback, exactly like `cal.v1` is today. The rollback story is "open
   `_parked/v1.3.html`", and it still has its data.
4. Version line to `2.0`. Republish the original artifact. Update `README.md`,
   `SESSION-HANDOFF.md`, `OPEN-ITEMS.md`.

---

## Decisions

### Settled 2026-10-24

1. **New Trade takes three numbers plus a ticker.** Price, shares and stop, with APTR manual. The
   reduced input list meant the checkboxes, the initial notes and the free-text concept field — not
   the stop, which sets `riskPS`, `initialRisk`, every R, the internal targets and, through
   `sideFrom()`, whether the trade is long or short at all. The concept field is not deleted either:
   it becomes the optional **setup dropdown** fed by the settings list, fillable later, and
   `t.concept` keeps feeding the by-concept statistics table.

2. **Sizing basis is protected equity.** Not net liq. Steve's formulation —
   *cash + Σ(stop × shares on all open positions)* — is the same number as the backlog's
   `aum + Σ(−riskAtStop)`, because `aum` is cost-based:

   ```
   aum                  = cash + Σ(avg × Q)
   −riskAtStop          =        Σ((stop − avg) × Q)
   aum + Σ(−riskAtStop) = cash + Σ(stop × Q)             ✓
   ```

   Implement the `riskAtStop` form, which also handles shorts correctly — `side` carries the sign,
   where "stop × shares" alone does not. This **adopts** the long-standing protected-equity item
   rather than superseding it, and it satisfies *equity responds to decisions, never to the tape*:
   `riskAtStop` reads `avg`, `stop` and `Q`, and never `t.last`.

   Two things carry forward from that item. It ships as a setting, reversible on a live book, and
   history is safe either way because `rUnit` and `aumAtOpen` lock at entry. And `bpUsed` is still
   the one place the tape leaks in — it marks at `t.last`, so a winner consumes buying power with
   nothing decided. Cost (`avg × Q`) is right for a cash account; a margin account's maintenance
   really is marked, so it may have to follow `marginX` rather than be one rule. **Still open.**

3. **Buy, Sell and Stop act on the position, never on the mark.** Buying shares, selling shares,
   moving stops. Marks come from **Update marks**: the API key by default, and with no key a popup
   covering every position in every account and group at once. So nothing was lost when *Set* went,
   and there is no need for a per-row mark control. I will make the row's Last cell editable in
   place anyway, since the list already renders that cell and it costs nothing — say so if you would
   rather it were read-only with the popup as the only path.

4. **Max and min allocation are both toggled settings with a field each.** Max caps position value
   as a percentage of equity and is what I.A.2.iii pushes size toward; min floors it and warns when
   a position is too small to be worth taking. The order they apply in is under phase 6.

   This **supersedes min-size-in-shares** from the older backlog item, which noted the flaw itself:
   a 100-share floor means different things in a $20k account and a $200k one, where a percentage of
   equity scales on its own.

   **Ruled out 2026-10-26 (Steve): no max stop width.** A wide stop at a fixed R means few shares,
   which min allocation already flags; the residual case — a wide stop on a name expensive enough to
   clear min allocation — still risks only R. The original reasoning is kept below for the record.

   ~~**Max stop width joins them as a third toggled setting.**~~ A different quantity — a ceiling on risk
   per share rather than on position value — so it is its own switch and its own field, and it comes
   off the backlog into v2. All three sit on the same settings screen. The old item's crossover
   arithmetic, which treated max-stop-width and min-size as one constraint, no longer applies now
   that min is a percentage of equity; what survives from that item is the reasoning for *why* a
   too-wide stop matters (a 1R win needs an implausible move) and the warning about its collision
   with the 1.5-APTR floor, which is still live.

5. **Tier stays on New Trade.** R becomes a calculated value with a fuzziness warning, and a warning
   needs something to deviate *from*, so the tier remains selectable at entry even though it no
   longer drives the share count.

6. **The gear opens a full per-trade panel**, not only the event log. Otherwise the 1R trail note,
   the internal-target ladder, the sequence spark chart, the plan fields, the notes box, the loss
   tag and the 30-day review have nowhere to live once the pills are gone. Details and plan, event
   log, adjustments. The row itself stays numbers and buttons.

### Mechanical, assumed unless corrected

7. **APTR carries old ADR values forward.** Not the same measure, but the same role, and nulling
   them would blank the weighted figure on every existing position. Migrated values get a one-time
   amber flag on the affected trades so they can be re-entered.
8. **Removing the compound toggle is made a no-op for books that had it off.** Compounding becomes
   assumed (III.C). For a book with `compound:false`, every trade's `compounded` is 0 while real
   realised P/L exists — so the first realising event after the switch would dump the entire backlog
   into equity at once. Migration sets `t.compounded = derive(t).realized` on every trade in such a
   book, so the switch changes nothing retroactively.
9. **Which stop feeds the APTR check.** The **furthest** stop, since it defines the worst case.

### Also settled 2026-10-24, after I got two of them wrong

10. **Unguarded shares are counted, not excluded, and the asymmetry is the point.** I called
    counting uncovered shares at zero "severe" and proposed barring the basis instead. That was
    wrong, and the formula already said so: an unguarded long share has a floor of **zero**, because
    the stock can go to zero. So `cash + Σ(stop × shares)` with `stop = 0` for unguarded shares is
    not a quirk to work around, it is the literal and correct reading. If 40 shares sit unstopped,
    more genuinely is at risk than intended, the Stop button says so, and the next trade sizes
    against that reality. **Default behaviour for all unguarded long shares.**

    **Shorts are different in kind, not degree.** An unguarded short has no floor at all — the loss
    is unbounded, so protected equity is −∞ and the budget is meaningless.

    **Default: refuse new positions in that account until a stop is added. Changeable in settings.**
    So flag-don't-block survives intact — nothing is hard-blocked, the strictest option is just the
    one that ships on.

    The alternative branch has to produce a finite number, and only one honest candidate exists:
    **fall back to realised-only equity for that account**, stated on screen, while any short is
    unguarded. Counting the unguarded short at the mark would be finite too, but it puts the tape
    back into sizing, so it is out. Realised-only carries its own known blindness (register #9) and
    is at least defined.

11. **Open heat stays in R.** The percentage-of-account-value phrasing in IV.C was shorthand in
    conversation, not a redefinition. So `heatCap` keeps its unit and v1's `heatR` survives
    unchanged, and phase 1's work here is a **rename only** — cash at risk is the dollar figure
    (v1's `heat$`), open heat is the same quantity in R. No migration, no changed threshold.

12. **Fuzziness is about integer-share granularity, not a tolerance band around R.** My reading was
    wrong and so was the rule I derived from it. Steve's case: at 3 shares a trade is 0.81R, at 4 it
    is 1.08R. The 4th share overshoots the budget by 0.08R and increases the position by **33%**. On
    small share counts the quantisation error in R is enormous, and refusing the overshoot costs a
    third of the position to save 8% of one R.

    So **"lot rounding always rounds down" was exactly backwards.** Rounding to nearest, with the
    overshoot bounded by fuzziness, is the point. The consequence has to be stated rather than
    discovered later: **the risk budget stops being a hard ceiling and becomes a target with a
    declared tolerance.** That is acceptable because the heat cap is the actual survival lever and it
    is computed from real risk, so an 8% per-trade overshoot shows up there honestly rather than
    being hidden by the rounding.

    One property worth keeping in mind when the pipeline is designed: this only ever bites on small
    positions. At 300 shares versus 301 the quantisation is 0.3%, so a percentage tolerance
    self-limits and needs no special case for small counts.

    It also decides I.A.2.v: **drop the tier selector and show a range across the pre-set R
    multiples**, with min and max allocation as *soft* walls. A single recommended share count is
    the thing being moved away from.

### Reversed 2026-10-26 — net liq comes out

**The document asks for net liq in the Portfolio summary (I.C.2.ii). It is removed, and I.C.2
should be read without it.** It was built, shipped, and taken out the same week.

The reason is the document's own. Value at risk was cut with the clearest statement of principle in
the whole brief — showing unrealised gains at risk "can cause psychological issues revolving around
the fear of losing unrealized gains which can make users break their systems." A live net-liq
readout is that same number wearing a different label: it is the figure that makes a trader protect
a gain the system has not told them to protect. Keeping it would have undone the value-at-risk
decision from the other direction.

So the Portfolio shows **equity** and nothing marked: AUM, which is cash plus what the open
positions are protected at. It moves on a close, a trim, a stop move, or cash in and out — never on
the tape. *Equity responds to decisions, never to the tape* now holds without the exception this
plan previously recorded against it.

Deposits and withdrawals stay in the Portfolio as the document asks (I.E.2); it is only the net-liq
figure that goes.

Note for whoever reads the .docx next: I.C.2.i's "unrealized gains" survives only inside **Book P/L
(mark)**, which was already in v1.3 and is realised plus open. If that framing is wrong too, it is
one tile to remove.

### Open questions, 2026-10-26

Raised by the review. The first is the one that matters.

1. **Protected equity was settled and never built.** Decision 2 says the sizing basis is
   `aum + Σ(−riskAtStop)`. Nothing implements it, and the Equity tile's comment claimed it did.
   Build it now, as a setting defaulting to realised-only? It carries two riders: the `bpUsed`
   cost-versus-mark question, and whether the **displayed** Equity figure switches with the basis
   or stays realised-only while only sizing changes.
2. **Should the allocation walls have their own tolerance?** Fuzziness at 10% means a 25% cap does
   not bind until roughly 27.5%. That is consistent with how fuzziness works elsewhere, but share
   rounding and concentration limits are different jobs and nothing says one number serves both.
3. **Is `root.fcTier` doing two jobs acceptable?** It is the calculator's highlight and the tier a
   new trade files under, so comparing sizes silently reclassifies the next trade.
4. **Lot rounding: consume it or drop it.** It is a setting nothing reads.
5. **Fuzziness at 10%** — my number, not yet confirmed.
6. **Marks (I.C.6)** is the largest unbuilt item with daily consequences: with no API key there is
   still no way to price the book. Next?

### Settled 2026-10-26, Steve's answers on takeover

These supersede anything above that disagrees, including the outline's II.A.3.v options.

1. **Sizing basis is AUM = cash + stop × shares** for every open position, side carrying the sign
   for a short. Not trade price, not net liq, not cash. Reason: sizing off trade price before the
   stop moves lets a cold streak hit harder than it should. Built: `aumOf()`; `rUnitOf()`, the
   allocation walls, New Trade, the group table and the AUM tile all read it. `pf.settings.aum` is
   now labelled *Book at cost* — the stored base the basis is derived from.
2. **No net liq, anywhere.** Unrealised gains counted as assets make traders abandon trailing stops
   to protect them. Confirms the 2026-10-26 reversal.
3. **Unstopped long shares take a $0 effective stop and are flagged.** They count at full cost in
   cash at risk, heat and AUM; an amber banner and the row say how many. Unstopped shorts are still
   flagged "unbounded" and add nothing — no finite number is honest (decision 10's refusal default
   is not built; flag only, for now).
4. **Size as close to the maximum as possible without passing the risk budget or max allocation,
   within fuzziness.** Built as: the largest count under each limit, or the one share over it when
   that overshoot is inside fuzziness — never a band to fill. 3.73 exact → 4, 10.2 → 11, 3.4 → 3,
   300.5 → 301. Replaces "nearest". The allocation wall takes the same one rounding step, which
   answers open question 2 above. One sizer (`tierSize`) now serves Fast calc, New Trade with a
   blank share count, and group New Trade.
5. **Group warnings are per account.** Each account takes the same trades, so heat and the cold
   streak are measured per account and the group shows the heaviest; summing R across legs counted
   one idea once per account. Heat cap and cold streak stay user-toggled with user-set caps.
6. **Settings and Data stay text tabs**, not icons.
7. **All coaching text removed.** Warnings state the figure and the threshold only.
8. **Unstopped shorts: Block (default) or Warn**, a ruleset setting (`shortGuard`). Block refuses
   New Trade in that account, and skips that account in a group trade, until a stop covers it.
9. **Lot rounding: On/Off plus "to the nearest multiple of:"**, applied to every suggested size
   (Fast calc, the New Trade range and blank-shares fallback, group New Trade); typed shares are
   left alone. Built with the same rule as single shares: the multiple under the limit, or the one
   over while inside fuzziness — so 250 exact at lots of 100 gives 200, 295 gives 300 (confirmed by
   Steve). **Per account, default 1**: set in Sizing for one account, and per member in the group
   members table when a group is open, so an edit never lands on the first member by accident.
10. **Manual marks follow Wheeler.** With no Finnhub key, Update marks opens one window: every symbol
    held in any account, alphabetised, shares held, mark age, one price per symbol written to every
    position holding it.
11. **Setups are one user-defined list** (root.defs.setups, beside loss tags). SCHEMA 4 folds every
    old per-account list into it and marks any trade whose text is not on it `legacySetup`: shown as
    a Legacy pill on an amber cell with the original text, counted under "Legacy" by setup, and
    refiled from the gear. Applied to open trades too, since they carry the same free text.
12. **The gear reaches closed trades** — under the ✕ once the row is expanded, and per leg in a
    group's expansion. It edits setup, tier, APTR now and at entry, ticker, AUM and 1R at open, loss
    tag, plan, notes, and every transaction.

### Settled 2026-10-27, review against the brief

13. **New Trade warns when typed shares leave the parameters** — risk outside the tier's fuzziness
    either way, allocation over max or under min. Flags, never blocks.
14. **Plan fields and Notes are optional on New Trade.** Notes is one field from entry to close.
15. **Noise stopouts and rule violations are toggled built-ins.** On: the tag is always offered,
    locked, and its tile shows. Off: both hidden. No colour thresholds on either.
16. **Loss discipline has no colour.** No percentage is known to be acceptable.
17. **Gain/loss colour is binary, gray inside the scratch band.**
18. **Popups:** average for an untouched position, break-even once added to or trimmed.
19. **"Stops loaded", default 1, affects only an open position's Stop button:** its current stops
    first, then blank rows up to the setting. Blank rows are dropped on save. Group stops and the
    edit dialogs ignore it.
20. **Initial capital is the base (option b).** The book is initial capital + deposits −
    withdrawals ± adjustments + realised P/L, worked out every time, never stored. Drift from
    broker rounding is an Adjust movement: type the broker's cash and the difference is recorded.
    Existing books get a worked-back initial capital, marked estimated, so nothing moves.
21. **Estimated tax:** per account, short-term rate (default 22%) and long-term (default 15%);
    FIFO lots; long-term over 365 days, shorts always short-term; wash sales across accounts,
    used only in the estimate; ST/LT netted within the calendar year; a YTD tile on the Portfolio.
    Red not-advice dialog on first switch-on; acceptance stored with its time and a check code.
22. **Buying power used:** cost for a cash account, the mark for a margin account.
23. **Name: RCalculator.** Masthead, title and backup filename. The repo and URL stay `calc`.
24. **What each panel shows (II.A.1.v)**, all seven proposals approved: Portfolio rows, expanded
    row and summary; Closed Trades columns; Statistics tiles and charts; New Trade's optional
    sections; Fast calc's allocation-and-risk line. 66 parts, all shown by default, set in
    Settings › Show on screen. Page-wide (`root.ui.hidden`), not per account. A position's
    identity, shares, prices acted on and actions are never hideable.

### 2026-10-28, the Closed Trades / Statistics / 30-day review pass

25. **Closed Trades** lists newest close first, adds Opened, Closed, Days (in trade), Avg entry and
    Avg exit, and carries no stat tiles -- those are Statistics' alone. The row's event log is
    read-only; delete and every correction are in the gear. The gear is for adjustments and the
    activity detail; notes and the 30-day review stay in the row.
26. **A group's Closed Trades never sums R across accounts.** The header gives each account's own
    total; the line keeps the mean. Delete-from-all is inside the expansion, not on the line.
27. **The equity curve is the book**: initial capital, cash in and out, realised P/L, by day, so it
    ends on `bookOf`. P/L % is measured against the book where the period starts.
28. **By setup splits Legacy by its original text** until a trade is refiled. Two duplicate P/L
    charts and the Planned-at-entry tile (v1 checklist) are gone.
29. **One period filter, All / YTD / Last 90 days**, over Closed Trades and Statistics together
    (`root.ui.period`). A trade belongs to the period it closed in. The review badge ignores it.
30. **The 30-day review is fixed at 30 days**, a one-month post-mortem; the setting is gone. Every
    closed trade past 30 days without one stays flagged, history included, by Steve's decision.
    A price-at-review field was declined: meaningless without the context it would lack.

Still open by Steve's choice: unrealised gains in the summary. Kept for now: fuzziness 10%, open
heat in R.

### Settled 2026-10-29

31. **Unrealised gains are a setting, off by default** (Settings › General and display, `root.ui.
    unrealOn`). On, the Portfolio summary shows open P/L at the last mark. It replaces the Book P/L
    (mark) tile, which was realised-plus-open and on for everyone. Position rows keep their P/L.
32. **The noise check is removed** — v1's ADR audit, which judged the stop against APTR (red under
    1.0, amber under 1.5). Steve does not want it. APTR stays as a figure: Weighted APTR and Daily
    vol. **Loss review stays**: every losing closed trade carries the "why" picker from the loss
    tags, and Statistics counts them.
33. **Fuzziness stays 10%, and every flag it drives is amber**: New Trade's typed size outside the
    tier (the R figure, Risk taken, the warning line), allocation over max or under min (Cost too),
    under-minimum sizes in the Fast calc and New Trade ranges, and a group member under its minimum.

### Settled 2026-10-29: the broker file (II.B)

Settled from two real thinkorswim Transaction History exports (stocks only; stocks, options, a
transfer and a dividend).

34. **Nothing from the file changes the book until it is ticked and applied.** Every difference is
    a row; Apply asks once more and applies only ticked rows. Each change is tagged Adj. with what
    it was ("From the broker file — was …"); an event the file adds says "Added from the broker
    file".
35. **One account per file**: the account in view; a group picks the member. Split fills (same
    ticker and direction, back to back, within 5 minutes) are one order at the volume-weighted
    price. Orders pair with app transactions on ticker and direction within 3 days; a different
    time on the same day is not a difference, a different day is a fix.
36. **What is offered ticked**: a real price, share or date difference; a broker order missing from
    a trade that was open that day (add, trim or close; a sell larger than the position is only
    flagged); transfers (deposit or withdrawal, noted "Broker transfer" -- the description carries
    the bank and the name, so it is not copied); dividends, as a cash adjustment, not a deposit.
    **Offered unticked**: a price difference under a cent; the file's stock fees; the option
    rows' net cash; a final adjustment to the broker's last balance, worked out after every other
    ticked row. **Flagged, no box**: an order that would start a trade (the file has no stop or
    tier), a transaction the file lacks, and a ticker-day where the two sides have a different
    number of orders (two round trips logged as one) -- shown both ways, fixed in the gear.
37. **Options are counted, not read.** The app has nothing to match them to; their cash is the one
    unticked adjustment above, so it never lands in stock cash by accident. Assignment and expiry
    rows have not been seen; any row type not understood is listed as not read.

### Still open (2026-10-29)

- **Tuning, kept for now:** open heat in R. Then cutover (phase 11), last.

Closed since this list was first written: the sizing pipeline (decisions 1, 4 and 12 — one sizer,
`tierSize`); `bpUsed` (22 — cost for cash, mark for margin); initial stop as a sizing basis
(rejected with net liq and trade price under 1–2: size from AUM at the current stop); the
tier-selector question (12); the Closed Trades / Statistics / 30-day review pass (25–30);
unrealised gains (31); the ADR and Loss audit revisit (32); fuzziness (33); the CSV import (34–37).

Built on a reading Steve has not yet confirmed: the pre-trade checkboxes are removed, as the later
outline says (III.B), rather than moved into the gear as the un-outlined ideas document had it.
Old trades keep `t.checks`.

---

## Build order: the shell first

Changed 2026-10-24 on Steve's instruction. Phases 2 and 3 split, and the **containers get built
before anything moves into them** — the settings tree, the two icons, the navigation, and the
Portfolio panel's frame — so that every later phase has a defined destination for what it removes
from the old layout. Phase numbering below is kept for reference; the running order is now
0, 1, **shell**, then 2–11 filling it in.

### Settled for the shell, 2026-10-24

**There is no Desk tab.** The fast calculator is **persistent chrome**, pinned at the top and visible
even while a tab's content scrolls. Since the Desk was already reduced to the fast calculator alone,
it stops being a destination entirely. Tabs are therefore **Portfolio, New Trade, Closed Trades,
Statistics, Audit** — five — with Settings and Data Management as icons.

**Account and group buttons go in a strip above the fast calculator**, not inside it. Steve offered
either; above is right because the account scopes *everything* — Portfolio, Statistics, New Trade —
and putting the selector inside the calculator would imply it only scopes the calculator. So the
pinned block is: masthead row (logo, account buttons, the two icons, clock), fast calculator,
section tabs. Then the scrolling content.

**Measured, because a pinned block that tall would eat the screen.** At 1440×900, content column
1162px:

| | height |
|---|---|
| masthead | 47px |
| account tabs | 28px |
| fast calc, one account, with an answer | 167px |
| fast calc, group of 4 | **339px** |
| fast calc input row alone | 55px |
| section tabs | ~28px |

Pinned naively that is ~285px for one account — 32% of the viewport — and **~457px for a group of
four, over half the screen gone before any content renders.** Group mode is the problem; a single
account would have been tolerable.

**So the pinned block holds the inputs and one answer line, and nothing else.** The per-account
breakdown table, the buying-power caveat and the APTR alternative become an expandable detail,
rendered only when opened. Resting height ≈ 200px, or 22% of a 900px viewport. A condensed state
that shrinks further once scrolled is a refinement worth having later, not needed to start.

**The rail goes; sections become browser-style tabs.** The largest structural decision in v2, and it
removes work rather than adding it:

- `initRail()`, the scroll-spy and the `#rail` markup all go.
- **The section collapse machinery goes with it** — `toggleSection`, `SECTIONS`, the `collapsed`
  map, every `tg_*` button. One section is visible at a time, so collapsing one is meaningless.
  **This deletes register #1 outright** rather than moving `collapsed` to `root` as planned.
- **Per-tab rendering becomes the natural shape, not a refactor.** `render()` currently rebuilds
  every card, the whole closed table and nine SVG charts on every action (register #22). With tabs
  it only has to build the visible one.
- Section numbering (`01 · Desk` … `06 · Data Management`) goes. The tab strip is the ordering.
- `#sec-*` anchors and the two `scrollIntoView` calls — the fast-calc hand-off and `rescueBook()` —
  become tab switches.
- **Audit is a tab**, which answers its placement. There is no Desk tab at all.

Costs, stated rather than discovered: a tab switch replaces scrolling, which is a changed habit.
The fast-calc hand-off is unaffected — better, in fact, since the calculator is now pinned above
whichever tab is open, so sizing and recording are visible together without scrolling at all.

**Portfolio rows: a primary row that expands.** With the gear also opening a panel, two disclosure
mechanisms exist and they need a clean split or they will overlap:

- **Row expand** — the figures that did not fit the row, plus plan fields, targets and the 1R trail.
  More numbers about *now*.
- **Gear** — event log, editing any transaction, notes, loss tag, 30-day review. **History and
  corrections**, in a modal.

And one thing to guard: this must stay *a list with an expanding row*, not N cards again. The
expanded region carries figures only — the actions stay the Buy / Sell / Stop / gear buttons on the
row itself. v1.3's pills each had their own action row, and that is the thing being removed.

**Settings: a full-width modal.** `.modalcard` is capped at 460px today and needs a wide variant;
`max-height:80vh` with `overflow:auto` is already there, so a tall tree scrolls as it stands.

**Settings tree** — the document gives General and display, Accounts, Sizing and risk. The doctrine
constants need a fourth, since the scratch band, loss tags and review cadence are neither display
nor sizing: proposing **Statistics and definitions**.

**Group rows** — legs grouped under a `gid` header row carrying the summed position, so a fanned-out
trade still reads as one idea.

**Naming** stays a placeholder through v2.

### The column problem, measured

The document's fields plus every v1.3 column plus identity and actions is **21 columns**. Above the
rail breakpoint the content column was 1162px — 1340 less the 118px rail, the 24px gap and 36px of
padding — or about 1118px inside a card. That is **53px a column**, against a price cell needing
70–110px. It did not fit, and no tightening would have made it.

Resolved by the expanding row above. Dropping the rail also returns its 118px plus the 24px gap, so
the full 1340px is available to the list — about 1296px inside a card, which is what makes a usable
primary row possible without horizontal scroll.

## Phases

Each phase ends with `v2.html` working and verifiable. Verification is programmatic in the browser
pane per `r-calculator-conventions` — build state on `root`, call `render()`, assert on the DOM.

### 1 — Foundations, invisible

Nothing on screen changes except money formatting. All of it is load-bearing for later phases, and
all of it is cheap to verify against a copied book.

- **SCHEMA 2 migration** (`migrate2()`), run from `normalize()`: field renames, settings moves, the
  `compounded` backfill (decision 8), stops to a list.
- **Cents everywhere** (I.E.1, IV.D). `fmtE` folds into `fmt$`. This retires the three-money-scales
  invariant, deliberately — note it in the handoff rather than leaving the old rule asserted.
- **APTR replaces ADR** (IV.B): `t.adr`→`t.aptr`, `adrAtOpen`→`aptrAtOpen`, `adrAudit()`→
  `aptrAudit()`, every label. Old values carried forward per decision 7.
- **Stops become a list.** The invasive one. `derive()` returns `stops:[{qty,price}]` instead of
  `stop`; `riskAtStop(t,d)` sums covered risk and returns `{risk$, uncoveredQty, overQty}`. One stop
  covering the full position is the migrated and default case, so every number should come out
  identical to v1.3 on a copied book — which is exactly the test.
- **Cash at risk / open heat renamed, not redefined** (IV.C, decision 11). Cash at risk is
  `Math.max(0, riskAtStop - realized)` summed — v1's `heat$` — and open heat is that same quantity
  in R, v1's `heatR`. The unit does not change and neither does the cap, so there is no migration
  here. Value at risk and open risk are deleted (III.D).
- **Borrow Wheeler's modal helper.** `openModal(title, body, okLabel, onOk, onInput)` — the
  `onInput` hook is precisely what the Buy/Sell popups need for live break-even (I.C.4.i.a), and
  cal's current modal has no such affordance.

*Verify:* copied v1 book renders byte-identical risk figures apart from formatting; a hand-built
two-stop position sums correctly and reports uncovered shares.

### 2 — Settings panel and the Data icon

- Settings opens from an **icon** beside a **Data Management icon** (I.D, II.A). Modal or slide-over
  panel; a full page section would just be the Desk again.
- Everything the Desk held moves in: AUM, margin, R %, tiers, heat cap, cold-streak brake (I.A.1).
- Heat cap and cold-streak brake become **toggle + amount** with presets (II.A.3.ii).
- New: **General and display** — default stop count, R size, fuzziness, lot rounding, per-panel
  display, hide values and gains, gain/loss colour grading (II.A.1).
- New: **Accounts** — initial capital, add accounts, group management, margin and buying power per
  account, group overrides (II.A.2.i–iv). The existing group-members modal moves here.
- New: **Sizing and risk** — tiers, the setups list, the targets toggle with up to two user levels,
  the sizing basis (default realised-only, switchable to protected equity per decision 2, reversible
  on a live book), and three guards each a toggle plus a field (decision 4): **max allocation**,
  **min allocation** (max stop width ruled out, see decision 4).
- `GROUP_KEYS` loses `compound`, gains the new overridable keys.
- The Desk section becomes the fast calculator alone (I.A, III.A), still at `#sec-desk`.

*Verify:* every setting round-trips through save/reload; a group member still reads its ruleset from
the group and its equity from itself.

### 3 — The Portfolio panel

The biggest visible change (I.C, III.F). "Open Positions" becomes **Portfolio**: one list inside one
panel, rather than N collapsible cards.

- `tradeCard()` → a table row. All the specified fields plus every v1.3 column kept (I.C.3.iv):
  initial allocation, trade price, initial stop, initial R on account, initial stop distance,
  dollars at risk per share, realised, unrealised, cash at risk, open heat, Last, Open P/L %,
  Equity P/L %, Seq at stop.
- **Unify the group renderer.** `groupTradeCard` exists only because a card cannot show which
  account it belongs to; a list can, in a column. Collapsing the two renderers into one deletes the
  failure mode that has bitten three times (`collapseAll`, `refreshMarks`, the cold-streak brake)
  and is the single largest simplification available in v2. Group legs become rows grouped by `gid`.
- Portfolio summary (I.C.2): weighted APTR, total allocation, cash at risk, open heat, unrealised,
  current net liq, plus the deposit and withdraw buttons moved here from the Desk (I.E.2).
- Collapse-all machinery, `t.collapsed` and `root.gcollapse` go away. `t.collapsed` is still *read*
  by nothing after this, so it is simply dropped on migration.

*Verify:* row figures match the v1.3 card figures for the same trade; a group trade's legs render
once each, with no duplicate or missing leg; summary totals equal the sum of the rows.

### 4 — Buy, Sell, Stop, and the gear

- **Buy / Sell popups** (I.C.4.i): price and shares only; live new-overall-break-even as you type,
  no warnings. Shorts keep v1 semantics — Buy trims or closes, Sell adds. These map onto the
  existing `add` / `trim` / `close` events; the `add` event type returns as a *writer* having been
  kept as a reader all along, which is the invariant paying for itself.
- **Stop popup** (I.C.4.ii): one stop by default, count from settings, add rows for split stops. The
  Stop button highlights when covered shares ≠ held shares, in **both** directions — fewer leaves
  open risk, more would open an unintended short.
- **Gear** (I.C.5): the per-trade panel from decision 6. Event log, editing of any past transaction
  with full downstream recalculation (IV.E — `derive()` already replays, so this is a UI and an
  audit-trail problem, not a maths one), and every edit written to the ledger tagged `Adj.`
  (II.B.3). `syncCompound` runs after every edit.
- Remove Set / 25% / 50% / Trim / Move / Close, keeping the inline Last cell (decision 3).

*Verify:* $10 then $20 on ten shares each shows a $15 break-even; editing an entry price moves
realised, R and equity consistently and leaves a ledger row; a 100-share position with a 60-share
stop lights the button and reports 40 uncovered.

### 5 — New Trade, stripped

- Inputs: ticker, shares, fill price, APTR, stop (decision 1), tier (decision 5).
- R and allocation become **calculated outputs** with fuzziness-driven warnings (I.B.2).
- Remove the four pre-trade checks, the gate, `checksDone()`, `updateGate()`, the initial notes and
  the required plan prose (I.B.3, III.B). This closes the deferred pre-trade-checks backlog item by
  deletion. `t.checks` stays readable for old books, written by nothing.
- The free-text **concept input** goes from the top level, but `t.concept` lives on as the setup
  dropdown's value (decision 1), so the by-concept statistics table keeps working.
- Optional and never required (I.B.4): setup from the settings dropdown, plan fields, targets if
  toggled on — all editable later from the Portfolio or the gear.
- Keep the fast-calc hand-off (I.A.2.iv).

*Verify:* a trade opens with ticker, shares, fill and stop alone; a deviating R warns without
blocking; a setup chosen later reaches the by-concept statistics table.

### 6 — The fast calculator finished

**The pipeline itself is a pre-build item, to be worked through together at Steve's say-so.** Not
designed here, because my first attempt at it got the central rule backwards (see decision 12). What
follows is only the material that session starts from.

Settled inputs:

- **No single recommended share count.** Show a **range across the pre-set R multiples** from
  settings, which closes I.A.2.v in favour of dropping the tier selector.
- **Min and max allocation are soft walls** — drawn, warned at, never enforced.
- **Fuzziness is about integer-share granularity**, per decision 12.
- Equity is realised-only or protected (decision 2); `rUnitOf()` is the single place the basis
  enters, so switching it cannot miss a call site.
- Protected equity counts unguarded long shares at zero and refuses while a short is unguarded
  (decision 10).
- ~~Max stop width is now a toggled setting too~~ — ruled out 2026-10-26 (decision 4).

*Verify, whatever the design turns out to be:* realised-only with fuzziness off reproduces v1.3's
share counts exactly; protected equity on the backlog's worked case — a 1000-share long at avg 100 —
moves the basis by −$4,000 at a 96 stop and +$4,000 at 104.

### 7 — Marks

- Default to the Finnhub key (I.C.6.i).
- With no key, a popup listing **every position across every account and group** for manual entry
  (I.C.6.ii). Wheeler's `marksUI()` is the pattern, including the detail that matters: a mark belongs
  to the **symbol**, not the position, so one price serves every account holding it. cal currently
  stores `t.last` per trade, so this either keys marks by symbol in `root` or fans one entry out
  across trades. The former is cleaner and matches Wheeler.

### 8 — Interface text

- Delete the section fluff and strategy explainers (III.E, IV.A): the tagline, the Desk hint, the
  Data hints, the fast-calc footer, the plan `<summary>` prose, the trail note's second half.
- **Rewrite every warning string** neutral — they stay and keep flagging. See the three-kinds-of-text
  split above; deleting a warning here would be the wrong reading of "remove all reminder text".
- **Mouseover bubbles** for basic field explainers only — what a field is, never what to do with it.
- The existing `terse-ui-copy` preference and the document agree completely on the deletions, so
  that half can be done aggressively.

### 9 — Estimated tax liability

Self-contained, late, and the only genuinely new maths in v2 (II.A.2.v).

- Checkbox plus marginal rate, per account.
- Short vs long term from `openTs` to `closedAt` across 365 days.
- Wash sales: the detector exists but only warns. A liability estimate needs the **disallowed
  amount**, which means partial disallowance and basis carried into the replacement lot. Worth
  saying plainly in the plan: this will be an approximation, and the disclaimer is doing real work.
- Red confirmation modal with Accept and Cancel; Cancel leaves it off and re-asks next time; Accept
  sets an obfuscated flag so later accounts auto-accept; the JSON records acceptance **with date and
  time**.

### 10 — Audit

New section (II.B). Built in this order; the CSV half landed 2026-10-29 once real exports existed
(decisions 34–37):

1. **The ledger first** — every transaction across the book, in one table, with `Adj.` on anything
   edited. Useful immediately, and phase 4 is already writing to it.
2. CSV upload and thinkorswim parsing.
3. The diff: mismatched fills, share counts, prices.
4. Mismatches shown first, with checkboxes for which get corrected automatically.

Keeps the plain name *Audit*; the existing ADR audit and Loss audit are renamed or revisited
separately, per his deferral.

### 11 — Cutover

As set out in section 0.

---

## What v2 does to the existing backlog

- **Adopted.** *Size off protected equity* is the v2 sizing basis (decision 2), so that item moves
  from To do to Decided/done when phase 6 lands rather than being superseded. Its `bpUsed`
  cost-vs-mark question is the only part still outstanding.
- **Superseded.** *Min size in shares*, by min allocation as a percentage (decision 4). *The
  pre-trade checks*, closed by removal in phase 5.
- **Fixed in passing.** `deleteTrade` deletes from `state` rather than the trade's own account, and
  Shares-override is silently ignored in group mode. Both die with the rewrites in phases 3 and 5;
  both should get a verification case rather than being assumed gone.
- **Fully absorbed.** *A stop that is too wide, and a size that is too small* — min size becomes min
  allocation, and max stop width becomes its own toggled setting (decision 4). The crossover
  arithmetic that made them one constraint goes with it, since min is now a percentage of equity
  rather than a share count. The item's collision warning survives and is still live: max stop width
  against the 1.5-APTR floor leaves an empty band on a volatile enough name, which is one conclusion
  — *this stock is too volatile for your rules* — not two warnings.
- **Untouched, still open.** Top themes, the interactive calendar, dividends, the extension check,
  recomputation cost, `render()` cost, per-account collapse state (moot after phase 3), naming the
  app, the rules panel.
- **New, created by v2.** Decisions 10–12 above — split stops versus the protected basis, open
  heat's unit, and what fuzziness measures — plus the Closed Trades / Statistics / 30-day review
  pass deferred to after this.

## Invariants that change

The handoff asserts these; v2 retires two, and they should not be left asserted.

- **Three money scales** → one. Cents everywhere (IV.D).
- **Group mode is a separate set of renderers** → one renderer, with group legs under a gid header
  row (phase 3). This is the invariant most worth deleting.
- **Sections are collapsible panels on one scrolling page** → tabs, one visible at a time. Takes the
  collapse machinery and register #1 with it.
- **Equity responds to decisions, never to the tape** → **survives intact, with no exception.**
  Protected equity is mark-independent: only a stop move, a size change, a close or cash in and out
  moves it. Net liq was the one figure that would have broken the rule, and it was reverted on
  2026-10-26 for the reason value at risk was cut. The rule needs no qualifier.

- **Flag, don't block** → **survives, with the strictest setting merely shipping on.** The unguarded
  short refusal is a default, not a rule (decision 10), so nothing in v2 blocks something the user
  cannot switch off.
- **"Your rule says…" → gone entirely.** Retired on Steve's instruction: the app encoding one
  trader's method is a v1 vestige, and v2.0 is generic. See below — this is wider than a wording
  change.

Unchanged and still load-bearing: locked-at-open fields, `syncCompound` on every realising path,
remove-what-creates-never-what-reads, `jsq()` for inline handlers.

## The app stops having rules of its own

Instructed 2026-10-24, and it reaches further than the interface text. v1 asserts a method in three
different ways, and all three go:

1. **Three kinds of text, and only two of them go.** Clarified 2026-10-24, because "remove all
   reminder text" could be read as removing the warnings too:

   - **Section fluff and strategy explainers — deleted.** The tagline, the Desk hint, the Data
     hints, the fast-calc footer, the plan `<summary>` prose, the trail note's second half. Baked-in
     explanation of one strategy.
   - **Warnings — kept, rewritten neutral.** "Your rule is no new trades until it comes back under",
     "the lever here is stepping back and reviewing — never resizing R to win it back", "not where
     my desired size wants it". The warning stays and keeps flagging; it states the figure and the
     threshold it crossed, and stops speaking as the user's conscience.
   - **Field explainers — kept, moved to mouseover.** What a field is, never what to do with it.

2. **Thresholds hard-coded as doctrine.** Most of these become settings. The question that decides
   the work is not *whether* but **where each one is stored**, and the app already has three places
   with different meanings:

   - **`root`** — about the page or the person. One value, every account.
   - **`pf.settings`** — about one account. Equity, margin.
   - **`GROUP_KEYS`** — about the *method*. Stored per account, overridden by the group when one
     owns it, merged by `settingsFor()`. Already holds `rPct`, `tiers`, `heatCap`, `coldR`.

   This is what Steve meant by sub-settings of account settings: a value like max open heat belongs
   with the account, not the app. Proposed scope for each, and the last column is the thing to argue
   with:

   | constant | line | what it decides | scope |
   |---|---|---|---|
   | `adrs < 1` / `< 1.5` | 885, 1511, 2578 | "inside daily noise" — and must come from one constant, not three | GROUP_KEYS |
   | `rmInt < -1.25` | 2133 | when a stop-out counts as a breach | GROUP_KEYS |
   | loss discipline ≤ 1.2R | `bookStats` | which losses were disciplined — also wants `rmInt` (register #4) | GROUP_KEYS |
   | `TARGETS = [1,2]` | 861 | which internal targets exist — already a setting (II.A.3.iv) | GROUP_KEYS |
   | max / min allocation | new | the guards from decision 4 (max stop width ruled out) | GROUP_KEYS |
   | fuzziness | new | the granularity tolerance (decision 12) | GROUP_KEYS |
   | sizing basis, unguarded-short default | new | decisions 2 and 10 | GROUP_KEYS |
   | `SCRATCH_LO/HI`, `WIN_R` | 511 | where a scratch ends and a win begins, across three win rates | `root` |
   | `LOSS_TAGS` | 520 | the causes a loss can be given | `root` |
   | `REVIEW_DAYS = 30` | 1932 | when a review falls due | `root` |
   | lot rounding | new | broker and instrument, not method | `pf.settings` |
   | `BACKUP_DAYS = 6` | 1942 | when the backup nudge appears | `root`, housekeeping |
   | `STALE_HOURS = 24` | 1643 | when a mark goes stale | `root`, housekeeping |
   | `WASH_DAYS = 30` | 1527 | statutory — stays a constant | — |

   Two things drove the `root` choices. The scratch band and the loss tags are **taxonomy**: let
   them vary per account and the three win rates and the loss-tag split compare trades measured
   different ways, which is the same silent-nonsense failure as `t.checks` (register #8). And a
   review cadence is about the person, not the book.

   **The display settings must go on `root`, and this is the one place v2 can repeat a known bug.**
   Hide values, gain/loss colour grading, information shown per panel, default stop count — seven
   new preferences about the *page*. Register #1 is precisely this mistake made once with
   `collapsed`, and in a group it writes onto whichever account happens to be first. Putting the new
   ones on `pf.settings` would reproduce it sevenfold.

3. **Whole features that are someone else's system.** Already handled: the pre-trade checks go in
   phase 5, the rules panel stays parked. Both backlog items framed these as "Russo's, not yours";
   the generic framing says something simpler and stronger — a hard-coded checklist does not belong
   in the app at all, whoever wrote it.

Knock-on for the register: entries 25, 26 and 27 are written in the "his rules versus the memoir's"
voice. They stay as written, because they are an accurate record of why v1 looked like that. The
forward-looking version is this section.
