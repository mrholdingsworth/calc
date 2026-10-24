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

   **Max stop width joins them as a third toggled setting.** A different quantity — a ceiling on risk
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
    is unbounded, so protected equity is −∞ and the budget is meaningless. So on the short side the
    app **refuses new positions in that account until a stop is added.**

    This is the only blocking rule in the app, and it needs recording as a deliberate carve-out from
    **flag-don't-block** or a future session will "fix" it. The distinction that justifies it: every
    other guard — heat cap, cold streak, wash sale, over-withdrawal — blocks a *judgment call*, and
    judgment is Steve's. This one blocks an *undefined number*. There is nothing to flag, because
    there is no figure to put in the warning.

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

### Still open

- **The sizing pipeline**, to be designed together before any building starts. See phase 6 for the
  settled inputs it begins from.
- **`bpUsed` marks at `t.last`** — the one place the tape still reaches a cost-based number. Cost is
  right for a cash account; a margin account's maintenance requirement genuinely is marked, so it
  may have to follow `marginX` rather than be one rule (from decision 2).
- From the document's own list: initial stop as a sizing-basis option, thinkorswim CSV details, the
  APTR/Loss audit test-case review, and the Closed Trades / Statistics / 30-day review pass. The
  tier-selector question is now closed by decision 12.

---

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
  **min allocation** and **max stop width**.
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
- Max stop width is now a toggled setting too (decision 4), so it joins the same screen.

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

- Remove essentially all reminder and strategy text (III.E, IV.A): the tagline, the Desk hint, the
  Data hints, the fast-calc footer, the plan `<summary>` prose, the trail note's second half.
- **Mouseover bubbles** for basic field explainers only — what a field is, never what to do with it.
- This is the one phase where the existing `terse-ui-copy` preference and the document agree
  completely, so it can be done aggressively.

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

New section (II.B). Depends on a thinkorswim test case that does not exist yet, so the pieces land
in dependency order and the useful half works without a CSV:

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
- **Group mode is a separate set of renderers** → one renderer with an account column (phase 3).
  This is the invariant most worth deleting.
- **Equity responds to decisions, never to the tape** → **survives, and gets stronger.** Protected
  equity is mark-independent: only a stop move, a size change, a close or cash in and out moves it.
  Net liq is displayed in the Portfolio panel but never sizes anything. The rule now has to cover
  one more case, though — the Portfolio panel shows a mark-dependent figure for the first time, so
  the line is "equity *for sizing* responds to decisions", and net liq is labelled as what it is.

- **Flag, don't block** → **survives with one named exception.** An unguarded short refuses new
  positions (decision 10), because protected equity is unbounded there and there is no figure to put
  in a warning. Every other guard blocks a judgment call, which stays Steve's. Record the exception
  with its reason, or it reads as a bug.

Unchanged and still load-bearing: locked-at-open fields, `syncCompound` on every realising path,
remove-what-creates-never-what-reads, `jsq()` for inline handlers.
