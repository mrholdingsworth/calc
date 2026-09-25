# Open items

Running list. Newest at the top of each section.

## To do

- **Top themes — a scanning notebook.** What you spot while scanning: a narrative or group that is
  moving, written down fast and kept in front of you when you size. Manually entered and tracked;
  nothing derived from the trade history.

  - **A theme is not a concept.** The existing `concept` field is structure — "mean reversion,
    multiday mover". A theme is narrative — "uranium", "datacentre power". They are orthogonal, and
    one trade can carry both. Do not fold either into the other.
  - **Entry has to be fast**, because scanning is fast. Name, and optionally a line of note and a few
    tickers. Anything that takes a form is a thing you will stop doing by Thursday.
  - **Tracked means a lifecycle.** A theme is noticed, runs, and fades. Carry the date it was added
    and let it be retired without being deleted, so "what was I watching in March" still answers.
  - **Placement**: the Desk, above or beside Fast calc — it is pre-trade context, and it should be
    visible without expanding anything. Collapsible once the list gets long.
  - **Open, deliberately not decided**: whether trades gain a `theme` field. It would let you ask
    which narratives actually paid, which is valuable — but it is a schema change and a second
    taxonomy to maintain at entry, and the notebook is worth having on its own first.

- **Draw the pre-trade checkboxes properly.** The four checks under New Trade are the last native
  controls in the app: `accent-color` on a browser-default square, in a UI where every other control
  is `panel2` on a `line2` border with a radius. They look borrowed.

  `appearance:none` on `.chk input`, then a 16px box matching the button treatment — `var(--panel2)`,
  `1px solid var(--line2)`, ~5px radius — with a CSS-drawn tick on `:checked`, blue fill, dark tick
  in `#04101f` to match `button.primary`. Hover brightens the border, `:focus-visible` keeps a real
  outline so the gate stays keyboard-operable.

  **Blue, not gold**, for the checked state: blue is the app's colour for things you operate, gold
  for values and emphasis — and `.chk b` already puts gold *inside* these labels, so a gold box would
  compete with the words it sits beside. Blue box, gold emphasis, clean separation.

  Worth adding while in there: `.chk:has(input:checked){color:var(--tx)}` so ticked rows brighten
  from `--sub` to full text. The gate becomes visible progress rather than four identical lines.

- **Interactive calendar: journal entries and daily P/L.** By some distance the largest item on this
  list — a month grid, each day carrying its result and a note you can write.

  What is derivable today, and what is not:
  - **Realised P/L per day is free.** Closed trades carry `closedAt`, and `renderCharts` already
    builds exactly this map (`byDay`) for the time-series charts. Lift that out and the calendar has
    its numbers with no new storage.
  - **Mark-to-market daily change is not.** The book has no daily equity snapshots, only marks taken
    whenever a refresh happened to run. It cannot be reconstructed backwards. If you want it, the
    app has to start writing a daily equity stamp from that release on, and the calendar stays
    realised-only for everything before it. Worth deciding early — it is the one part that cannot be
    retrofitted.
  - **Cash movements already carry dates** (`cashFlows`, v1.1). Mark them on the calendar: a deposit
    day explains an equity jump that was not performance, which is exactly the confusion a
    P/L calendar would otherwise create.

  Design questions:
  - **Store.** `root.journal` keyed `YYYY-MM-DD`, global rather than per account — a journal is about
    the trader, not the book. It should survive switching tabs.
  - **Make the day click through.** A bare diary is worth little; a day that lists the trades closed
    on it, with their R multiples, is worth a lot. That link is most of the value.
  - **It would be a fourth note field**, alongside a trade's re-trade review and its 30-day review.
    Decide how they relate before building, or the same thought gets written in three places. The
    30-day-due count could surface on the calendar rather than only in headers.
  - **Colour.** Resist a green/red heat map by instinct — R, not dollars, is the unit everywhere else
    here, and a day of +0.5R on a small book should not read paler than +$800 on a large one.

- **Extension check: am I chasing?** Your use of ADR differs from the memoir's, and both are worth
  having because they measure different distances with the same unit:

  | | Numerator | Question | Bad when |
  |---|---|---|---|
  | present (Russo) | stop distance | is my stop outside the noise? | under ~1.5 ADR |
  | new (yours) | distance already travelled | am I late? | over ~0.5 ADR |

  They are orthogonal — a well-placed stop on a chased entry, or a well-timed entry with a stop
  sitting inside the noise, are both possible — so this adds to the vocabulary rather than replacing
  anything. **Open question: does the 1.5-ADR floor stay?** If it goes, the "band" framing in the
  max-stop-width item below loses one of its two edges and that entry needs rewriting.

  Reference point to settle, since it changes the number:
  - **from the day's low** (long) or high (short) — how much of a normal day's move is already behind
    you. Most directly answers "am I chasing".
  - **from the open** — ignores an overnight gap, which may be the point or may hide it.
  - **from the prior close** — counts the gap as travel. Right for gap-and-go, wrong for a name that
    gapped and then based for two hours.

  Data: `refreshMarks` already receives this. Finnhub `/quote` documents `h`, `l`, `o` and `pc`
  alongside `c`, and the code reads only `c` (see the fetch in the live-marks section). Confirm
  against a live response, then capture the rest and the check costs no extra calls.

  Two placement notes. A pre-trade check needs a quote for a ticker that is not yet a position, so
  New Trade would fetch on ticker entry — one call, on demand. And it cannot live in Fast calc at
  all, which has no ticker field by design; that stays a pure price-stop-tier tool.

  Without a key: a manual "ADRs extended" input, or day high/low fields.

- **A stop that is too wide, and a size that is too small.** Two requested guards that turn out to
  be one constraint seen from opposite ends. Both are ceilings on risk per share:

  ```
  max stop %   ->  risk/share <= (maxPct/100) * price      e.g. 5% of a $10 entry = $0.50
  min size     ->  risk/share <= budget / minShares        e.g. $500 budget / 100 sh = $5.00
  ```

  They bind at opposite ends of the price range and cross at
  `price = 100 * budget / (maxPct * minShares)` — $100 for a $500 budget, a 5% rule and a 100-share
  floor. Below that the percentage rule binds, above it the share floor does. Checked: at $10 the
  rules allow $0.50 and $5.00; at $200, $10.00 and $5.00; at $100 both give $5.00 exactly.

  So do **not** build two independent warnings. Compute one number — the widest stop this trade
  supports — and name whichever rule produced it. Simpler to read and it cannot contradict itself.

  Why each matters, since the reasons differ:
  - A stop too **wide** means a 1R win needs an implausibly large move. It is a statement about
    whether the trade can pay, not about whether the risk is acceptable — the risk is 1R either way.
  - A size too **small** means the position cannot be managed: a 25% trim of 8 shares is 2 shares,
    and fixed costs stop being noise. It is about manageability, not about risk.

  Watch the collision with the ADR audit. That one flags a stop *too tight* for normal noise (under
  1.5 ADRs); this one flags *too wide*. Together they are a band, and on a volatile enough name the
  band is empty — a 12% ADR wants a stop around 18% wide, which a 5% rule forbids. That is not two
  warnings, it is one conclusion: **this stock is too volatile for your rules.** Say that, once.

  **Depends on the extension item above.** The band has two edges only while the 1.5-ADR floor is a
  rule you keep. Decide that first: if ADR becomes purely an extension measure, the floor goes, and
  the max-stop-width rule stands alone with nothing to collide with.

  Implementation notes: both parameters are method, not account — they belong in `GROUP_KEYS`
  alongside `rPct`, `tiers`, `heatCap` and `coldR`. Surface in New Trade, Fast calc, and per account
  in the group table, since a small account can fail a share floor that a large one passes. Warn,
  never block, consistent with the heat cap. The group sizer's existing "0 — too small" line is the
  degenerate case of the same idea and should fold into it.

- **A third add mode: lock in profit.** Today an add can be sized to risk a full R (`"r"`) or to
  leave the sequence at breakeven (`"be"`). Missing is the case in between — add *some* size, but not
  so much that a stop-out takes the whole trade back to zero. Currently done by hand.

  It is not a new mechanism. Both existing modes are one formula with one term changed. Solving for
  the sequence's worst case at the new stop, where `target` is what you keep if stopped:

  ```
  q = ( realized − side*(avg-S)*Q − target ) / ( side*(addPrice-S) )
  ```

  `target = −budget` is 1R mode, `target = 0` is B/E, and the missing mode is simply `target = +L`.
  In `maxAdd` the existing `b` term is `−target`, so the change is passing a signed target instead
  of a one-sided budget.

  Verified against a worked case (long, 100 sh at avg 100, realized 0, 1R = $1,000, add at 110, new
  stop 105): 1R → 300 sh → avg 107.50 → −$1,000 at the stop. B/E → 100 sh → avg 105.00 → $0.
  Lock +0.25R → 50 sh → avg 103.33 → +$250. Each recomputed from the resulting average, so the
  formula holds at all three points.

  Questions to settle before building:
  - **Unit.** R fits the app, and it makes the mode scale per account in a group for free, since
    each leg multiplies by its own `rUnit`. Show the dollar equivalent beside it.
  - **Scope.** `sizeMode` currently lives in `state.settings` — global and sticky. A lock amount may
    want to be per trade instead: 0.5R on a conviction add, 0.25R on a speculative one.
  - **UI.** The three modes are one number on a continuum, so the 1R / B/E pair could collapse into
    a single "worst case at the new stop" control rather than gaining a third button.
  - **The unreachable case.** If the position does not already lock at least `L` at the new stop,
    `q` comes out negative. Clamp to zero and say why — "you cannot add anything here and still keep
    +0.5R; tighten the stop first" — rather than showing a bare 0 as though the budget were spent.

- **Dividends received on an open trade.** Add a per-trade dividend amount so cash paid while the
  position is held is part of its result. Questions to settle first: does it count toward realized
  P/L and therefore the R multiple, or sit beside it as a separate line? It is not risk-financed, so
  letting it finance an add through the constant-risk formula would be wrong — probably it should
  land in `events` as its own type, be excluded from the add budget, and be reported both inside
  total return and separately. Long positions receive, shorts pay.

*From the pre-1.0 review, 2026-09-01. Everything else on that list was fixed; these were deferred
deliberately.*

- **`deleteTrade` deletes from `state`, not from the trade's own account.** `getTrade`/`acctOf`
  search every portfolio, but the delete filters `state.trades`. Not reachable today — group cards
  use `gDelete`, and `tradeCard` only renders in account mode — so it is latent, not live. One line:
  filter `root.portfolios[acctOf(id)].trades` instead. Do it before adding any new delete call site.

- **Shares (override) is silently ignored in group mode.** The field renders and accepts input;
  `openGroupTrade` never reads it. Either hide it when a group is active or honour it as a per
  account override. Low urgency — sizing in a group is the whole point of the R fan-out.

- **Recomputation cost.** `derive()` replays the full event log and is called from ~26 sites;
  `bpFree → bpUsed → derive` runs for every open trade, per member, on every keystroke in New Trade.
  A memo keyed on `t.events.length` plus the last event's timestamp would kill most of it.

- **`render()` rebuilds everything on every action** — all open cards, the whole closed table with
  its textareas, all nine SVG charts. Fine at a few dozen trades; the fix when it matters is to
  split render into per-section renderers and call only what changed.

- **Section collapse state is stored per account — decide whether it should be.** Reported
  2026-09-01 as "switching accounts minimised the Desk, once, then never again". Not a startup or
  restart bug; it reproduces every time. `collapsed:{desk,new,open,tally,charts,data}` lives on
  `pf.settings` (see `defaults()`), and `renderSections()` reads it off `state`, which is whichever
  account is in view. So an account carrying `desk:true` from some earlier session folds the Desk the
  moment you switch to it. Expanding it writes `false` and saves, which is why it never recurred.

  Same root cause, still live: in a group `state` is the *first member*, so collapsing a section
  while a group is open silently writes onto that one account's settings.

  Collapse is a preference about the page, not a property of a book. Proposed fix: move `collapsed`
  to `root`, migrate on load by taking the active account's existing map and dropping the per
  portfolio copies. Small change, but it rewrites stored data, so worth doing deliberately with an
  export taken first.

- **Name the thing.** The masthead is a plain placeholder for now. Needs a real name, at which
  point the masthead, the `<title>` and (if you want them to match) the repo/URL change together.
  The in-app "Cal" references are already gone.
- **Rules panel — rebuild around your own system.** The paraphrased seven-part "bible" was pulled
  out of the page. The original markup is parked in `_parked/bible.html` so nothing is lost.
  Re-add later, rewritten to your own rules rather than the memoir's.

## Ruled out

- **Rolling 25 trades per concept** — not wanted. Do not re-propose.
- **Market open / closed indicator** — not wanted. Too many variables change year to year (holiday
  calendar, half-days, DST) to keep it honest. Do not re-propose.
- **Wash-sale basis maths** — not wanted. The entry-time flag that exists is the whole of it; the
  accounting stays with the broker's 1099-B.

## Decided / done

### 2026-09-19 — v1.1.1, three bug fixes

- **Trimming now moves the portfolio value.** Realised P/L only reached equity at the close, so a
  trim banked profit the book could not see. New `syncCompound(t, acct)` folds in the difference
  between a trade's realised total and the part already counted, tracked on `t.compounded`. Wired
  into trim, close, undo, adjust, and both group equivalents, so no path can double count. Backfill:
  closed trades start at their realised total (the old close already added it), open trades at zero,
  so the next realising event catches up any pre-existing trims — that is the correction, not a side
  effect of it. Unrealised P/L still never moves equity; decisions stay cost-based.
- **Buying power after a trim** was a symptom of the above, not a separate fault: `bpUsed` fell
  correctly with the share count, but total buying power is equity × margin, and the equity half was
  frozen. It tracks now.
- **Adds respect buying power.** `maxAdd` had no buying-power term at all — on a fully deployed
  $100,000 cash account, a 10c stop offered 9,000 more shares of a $100 name, about $900,000 of
  stock. It now takes the smaller of risk and cash, reports which is binding, and separates "no room
  on risk" from "no room on cash" since the remedies differ. Group adds pass their own account.

### 2026-09-19 — v1.1

- **Deposit / Withdraw on the Desk.** Manual AUM editing fought the compounding mechanism: a broker
  balance carries unrealised P/L on open positions, so keying it in double-counted that money when
  they closed. Cash movements are deltas now, recorded in `pf.cashFlows` and listed under the Desk
  with the equity each produced. The dialog previews new equity and new 1R, and warns (does not
  block) when a withdrawal leaves less buying power than open positions are standing on. Removing a
  movement reverses the equity and deletes the record rather than offsetting it. Per-account buttons
  in the group equity table. `cashFlows` is additive and backfilled in `normalize()`, so SCHEMA
  stays 1 — bumping it without a migration to point at would be noise.

### 2026-09-01 — layout

- **Labels are bottom-justified.** The auto margin moved from above the input to above the *label*,
  so label and input travel down together. A label that wraps to two lines no longer leaves its
  one-line neighbours floating at the top of a tall cell — every label now sits on the line directly
  above its own box, and the controls still share a baseline.
- **Desk is one row of nine** (`.fields.deskrow`). The tier boxes hold "0.25" and were sized down to
  74px, which is what buys the row. Compound was widened to 132px purely to keep its label on two
  lines like its neighbours: at three it alone set the row height and cost 14px across the panel.
- **New Trade: Tier widened to 168px, Concept gave up the width.** Tier carries
  "A &mdash; 0.5R ($500.00)" and was truncating; Concept is the one field with nothing to lose.

### 2026-09-01 — after the review

- **No Side field on New Trade.** The stop already carries the direction — below the entry is a
  long, above it a short — so `sideFrom()` now serves both Fast calc and New Trade. A direction you
  can set independently of your stop is a direction you can set wrong. The inferred side shows as a
  LONG/SHORT pill on the sizing answer, and matching entry and stop is the one refused case.
- **New Trade fits one row** above 1120px (`.fields.oneline`), falling back to the wrapping grid
  below that. Seven fields, inputs sharing a baseline, no horizontal overflow.
- **Money split into three scales.** `fmtE` whole dollars for equity and buying power, where cents
  are noise and cost a column of width; `fmt$` always exactly cents for risk, cost, value, P/L and R
  in dollars; `fmtP` up to four decimals for anything per share. That last one is not cosmetic — at
  1.1155 against a 1.1125 stop, risk per share is $0.003, and two decimals printed it as $0.00.

### 2026-09-01 — pre-1.0 review pass

- **Marks refresh the whole book.** `refreshMarks`, `pollMarks` and the boot refresh all read
  `state.trades`, which in a group is the *first member only* — every other account kept stale
  prices, falsifying its open P/L, heat, buying power and vol check. Now `allOpenTrades()` across
  every portfolio, deduplicated by ticker: one request per distinct symbol applied to every position
  holding it, so four accounts in one name is one call. `429` now reads "rate limited" rather than
  "failed".
- **Cold-streak brake spans the scope** (`scopeTrades`), not the first member. Still advisory.
- **Wash-sale check spans every account** and names the one the loss was in — the rule follows the
  taxpayer, not the book, and the cross-account case is the one people miss.
- **Apostrophes in account names no longer break their row controls.** New `jsq()` escapes for JS
  *then* for HTML; `esc()` alone produced `&#39;`, which the parser decoded back before JS parsed
  the handler. Fixed at all five remaining sites.
- **Save failures are loud.** `save()` returns a boolean and raises a persistent red banner naming
  the error, with an Export my book button that bypasses storage entirely. Silent failure was the
  worst outcome in the file: correct on screen, gone on reload.
- **Schema version.** `root.v = SCHEMA`, stamped on new books and backfilled in `normalize()`.
- **Storage key renamed** `cal.v1` → `rcalc.v1`, read across once on load with the old entry left
  untouched as a fallback, and an amber confirmation banner so the migration is visible.
- **Import confirms** before replacing a non-empty book, stating what is discarded and what arrives,
  and pointing at Download .json first — the box holds the incoming data, not a copy of yours.
- **Backup nudge**: amber label on the Desk header at `BACKUP_DAYS` (6) since the last real backup.
  Only Download and Copy count; Export to box only puts JSON on screen.
- **Heat cap and cold streak stopped claiming enforcement they never had.** Both say "flagged, not
  blocked", and the heat breach now also lands under the Open trade button, where the decision is.
- **Member opt-outs are loud**: amber count plus the names, and a line saying they persist.
- **Money carries cents, and up to four decimals when the number has them.** One `MONEY` format for
  `fmt$`/`fmtP`. `roundPx` takes the tick from the price typed for that trade, so 110.25 gets cent
  stops and 1.1155 keeps four decimals — a flat 4dp rule produced unplaceable prices like 110.2563.
- Removed the duplicated `live marks` section header and the last `cal-` filename.

### Earlier

- 2026-09-01 — **ADR % at entry** box on each open position. Needed a new stored field: `t.adr` is
  live and editable, so editing it destroyed the figure the stop and size were chosen against.
  Trades now carry `adrAtOpen`, written by both open paths, with the per-share dollar move at the
  entry price and the current ADR in amber when they diverge. Existing trades backfill from `t.adr`
  in `normalize()` — exact where the ADR was never edited. Group cards carry it on the summary line
  rather than per leg, since every leg is opened off one form.

- 2026-09-01 — Fixed **Collapse all / Expand all** in group mode. They date from the first upload
  (891ba27) and had never worked there: the buttons set `t.collapsed` on each trade, while group
  cards read `root.gcollapse[gid]`. Account mode was always fine. `collapseAll` now writes whichever
  flag belongs to the renderer on screen, keying group cards the same way `render()` does so a trade
  opened in one member only (`solo:<id>`) collapses too.

- 2026-09-01 — **Weighted ADR** tile on the Open Positions bar, next to open heat: sum of each
  position's share of equity times its own ADR, plus the dollar equivalent. Absolute value so shorts
  count; across a group it is total ADR dollars over total equity. Positions with no ADR are counted
  and named in amber, since they can only make the figure read low. No colour thresholds on the
  number itself — what counts as too much daily movement is a judgement, not a constant.

- 2026-09-01 — **Clear** button on New Trade, matching the one in Fast calc. Right-hand end of the
  Open trade row, deliberately not beside the button, since it wipes a written-out plan. Both open
  paths reset through the same `clearNewTrade()` so nothing can drift. Caught an existing gap doing
  it: ADR % was in neither reset list, so it survived an open and was recorded onto the next trade.

- 2026-09-01 — Per-account **Fill** column on the group New Trade table, sitting after Equity. Blank
  means the shared entry. It deliberately does **not** resize: size is settled at the shared entry
  (usually via Fast calc), and the fill only sets the price the trade is recorded at, plus the cost
  and allocation that follow from it. The point is accurate tracking, not sizing — every closed-trade
  statistic reads back the entry price. Cent steps on the arrows. A fill past the stop warns in amber
  but still opens. Fixed two latent bugs alongside it: the buying-power tooltip rendered its own
  source text, and an account name containing an apostrophe broke the row handlers (row index now).

- 2026-08-31 — Five date notes under the masthead clock, in gold, keyed MM-DD: New Year, Valentines,
  tax day, 4 July, and 24-26 December sharing the Christmas one. Deliberately impersonal — the repo
  is public, so no names or birthdays.

- 2026-08-31 — Masthead clock, right-justified opposite the wordmark. 24-hour with gold colons and
  tabular figures so the digits do not shuffle as they tick; weekday and date beneath. Updates every
  second and touches only its own element, so it cannot disturb a field being typed into. The market
  open/closed half was ruled out — see above.

- 2026-08-29 — Gold vertical bar replaces the slash wherever two parallel things sit side by side, in
  a label or a value: win rate, avg win/loss, avg days held, winners/losers, long/short, Concept |
  setup, Mark | last price, Trim | take profit. Left alone where the slash is not a separator —
  "R / last 5" is a unit, "P/L" and "R/day" are abbreviations, and the 25%/50% error text is prose.

- 2026-08-29 — Win rate shown three ways, each stricter, all over the same denominator (every closed
  trade): raw (above zero), ex-scratch (above +0.10R) and decisive (at or above +1R). No loss rate,
  no fractions on screen, gold separators. Scratch band -0.05R to +0.10R, wider on the positive side
  so a bad fill on a breakeven stop still reads as a scratch.
- 2026-08-29 — Every closed-trade statistic now also heads the Charts & Statistics panel, above the
  graphs. bookStats() and statsHtml() were extracted so the tally and the panel cannot diverge; in a
  group the panel follows the account picker while the tally keeps showing group totals.

- 2026-08-29 — Fast calc on the Desk: price, stop, tier, shares, and nothing else. Side is inferred
  from which side the stop sits. Works per account and per group, honours buying power identically to
  New Trade, and records nothing. "Send to New Trade" carries price, stop, side and tier across and
  focuses the ticker, so a trade is sized before the order and recorded after it without being typed
  twice.

- 2026-08-29 — Margin and buying power. Per-account setting (Cash / 2x / 4x / 6x) on the Desk, and a
  column in the group members table. Buying power = equity x multiple; open positions consume it at
  their mark. Sizing takes the lesser of the R-derived size and what buying power allows, and states
  the fraction of an R that leaves you taking. Book bar shows buying power used, amber past 80%,
  red at 100%. A ceiling only — no maintenance requirements or per-security haircuts.
  Deviation from the request: one dropdown with "Cash — no margin" as the first option, rather than a
  checkbox plus a level. Same information, and it cannot reach the inconsistent state of margin
  unticked with 4x still selected.

- 2026-08-29 — Targets back, informational only and trimmed to +1R and +2R, in both New Trade and
  Open Positions and in both account and group mode. A target price does not depend on account size
  (shares scale with R, so k·R/shares reduces to k·risk-per-share/mult), so one row serves a whole
  group; the open-position line weights across the legs. Nothing is pre-placed and nothing acts on
  them. A rung goes green once the last mark has passed it.

- 2026-08-28 — Gold divider in the tab strip, separating what you select (accounts, groups) from what
  you do (new account, new group, members, delete).

- 2026-08-28 — Group box is a bordered container with real padding, height-cancelled by a negative
  vertical margin, so the tab row does not grow when a group opens. (An outline was tried first and
  collided with the pill edges — it paints with no padding of its own.) 5px clearance all round,
  zero desk shift.
- 2026-08-28 — Members picker is a dialog with a checkbox per account (showing equity and open count,
  and naming the group when one is already spoken for) plus a group dropdown once more than one
  group exists. Edits are held as a draft across every group, so you can move an account out of one
  and into another and save once; the picker marks which groups have unsaved edits. Cancel discards
  the lot. The comma-separated prompt is gone.
- 2026-08-28 — New Trade puts Shares first and in gold: it is the number you act on.
- 2026-08-28 — Position P/L % added beside % equity in Closed Trades, account and group views alike.
  Realized over capital deployed (every entry and add), against realized over equity at open.

- 2026-08-28 — **Account groups built.** Groups sit in the tab strip with a leading dot and open out
  into a bordered box holding their member accounts; grouped accounts no longer appear as top-level
  tabs. The desk shows the shared ruleset plus a per-account equity table. New Trade lists one row
  per account with a tick box, equity, 1R, risk, shares, cost and allocation, and names any account
  that sizes to zero. Open Positions render one card per group trade with a row per account across
  Stop, Last, Open P/L, Open P/L %, Equity P/L %, Realized, Seq at stop, Total, Cost, Value and
  Allocation, over one set of controls applied to every leg on its own numbers. Closed Trades shows
  the group total on the line and per-account statistics in the expansion. Charts take an account
  picker, since none of those statistics survive pooling across accounts of different size.
  Trims broadcast as a percentage, never a share count. Deleting a group hands each member a copy of
  the ruleset so open trades keep sizing against the numbers they were opened under.
- 2026-08-28 — Targets removed from both panels pending a rework (now on the to-do list).

- 2026-08-28 — Reviews-due badge mirrored onto the Desk header, so the queue is visible from the top
  of the page whatever is collapsed. Both badges render from one function and cannot disagree.

- 2026-08-28 — 30-day review built. Every closed trade has its own field beside the re-trade review;
  the row takes a gold left rail, a gold dot and a faint gold wash once 30 days have passed with it
  empty, and clears the moment anything is written. The count sits in the section header so it is
  still visible with section 04 collapsed. The panel label reads "due now", "done", or "in N days".
- 2026-08-28 — Wash-sale flag on new trade entry: naming a ticker you closed at a loss inside the
  last 30 days shows an amber line under the Open trade button, citing the most recent loss and
  counting any others in the window. Non-blocking, and no basis maths — that stays with the 1099-B.
- 2026-08-28 — MAE/MFE dropped for good: the to-do item, the dead hi/lo tracking, the excursion
  computation and the parked notes are all gone. Recoverable from git history if it ever returns.

- 2026-08-28 — Single gold set to the darker metallic #b08d3f, applied to every gold instance:
  masthead R, prose emphasis, max-add bolds, target rungs, checklist bolds, open heat, and the
  time-series chart stroke and fill. 5.5-6.2:1 on the grounds it sits on.

- 2026-08-28 — All in-app "Cal" references removed: the panel heading is now "Max add", plus the add
  qty placeholder, the live max hint, the zero-max error, the re-trade prompt and the failed-import
  message. Only the README's note about the original cal.xlsx still names it, which is history.

- 2026-08-28 — Annualised return removed: on short holds it produced six-figure percentages wide
  enough to force horizontal scrolling, and the number was never load-bearing.
- 2026-08-28 — R distribution axis carries at most five ticks (worst R, zero, two through the winning
  side, best R) instead of one label per bucket.
- 2026-08-28 — Open positions show position cost, current value and allocation as a percentage of the
  equity the trade was sized against.
- 2026-08-28 — Empty Open Positions message moved inside the collapsible body; it was sitting in the
  header card and stayed visible when the section was shut. Also removed a duplicate of it.

- 2026-08-28 — Collapsed trade row sits at the same height as the expanded one, and is centred in its
  card: the header keeps the card's own padding and loses only the trailing margin it needs when
  metrics follow it. 17px top in both states.

- 2026-08-28 — Finnhub key moved to Data Management with the other non-trade settings. The Refresh
  marks button now sits on the Open Positions header, next to what it updates, and turns amber with a
  count when any position is stale. Staleness centralised on one STALE_HOURS constant.

- 2026-08-28 — Section labels trimmed to the substantive word and set in Title Case, with the index
  matching: Desk, New Trade, Open Positions, Closed Trades, Charts & Statistics, Data Management.
  "Position size" and "Tally" both restated what the calculator is.
- 2026-08-28 — Index rail uses its own shorter labels (Open Trades, Statistics, Data) so it can sit at
  118px; that also let the rail appear from 1120px wide instead of 1180px.

- 2026-08-28 — R distribution buckets now span only the range actually traded, worst loss leftmost and
  best win rightmost, with the top bucket opened out so a trade landing exactly on a boundary gets
  its own column.
- 2026-08-28 — Open trade is gated on all four pre-trade checks, and moved above the plan panel, which
  now opens by default. The button states how many checks remain rather than sitting dead.
- 2026-08-28 — Section 03 header moved inside the book-bar card so every section shares a card edge.
- 2026-08-28 — Controls and buttons share a row height. Ticker and its toggle no longer split across
  lines on narrow screens.
- 2026-08-28 — One gold (#dfbd69) everywhere, prose gold bolded. Open heat is gold at rest and red
  only when the cap is breached.
- 2026-08-28 — Annualised caveat moved off every row onto the column header.
- 2026-08-28 — Clear all data, behind two confirmations, exporting the book to the box before it goes.

- 2026-08-27 — Closed-trade metrics: days held, R per day, % of equity at open, annualised return,
  and MAE/MFE. Annualised figures under a week carry an amber asterisk — extrapolation, not a
  forecast. MAE/MFE is measured in multiples of the per-share risk taken at entry, so it compares
  across trades of different size; note it is a different R basis from the account-level R multiple
  column beside it. Highs and lows are seeded from prices the app has seen and overridable by hand,
  since it cannot know the true intraday range. (MAE/MFE removed again 2026-08-28.)
- 2026-08-27 — Charts & statistics section (05), added to the index: R distribution, cumulative R,
  P/L per trade, cumulative P/L over trades and over time, P/L % over time, equity curve. Plus a
  statistics panel — days held winners vs losers, R per day, max drawdown on the R curve, long/short
  expectancy — and expectancy tables by tier and by concept.
- 2026-08-27 — Every section collapses, on one shared mechanism; the tally's bespoke toggle folded
  into it, migrating the old flag.
- 2026-08-27 — Date fixes: Escape backs out of an edit, saving with nothing changed just closes the
  pickers instead of erroring, future dates are refused, and same-day events are allowed so a day
  trade stops being an ordering error. Edits keep each event's clock time, so intraday order holds.
- 2026-08-27 — Gold deepened to #dfbd69 with #b08d3f for larger type.

- 2026-08-27 — Dates are now edited inline: click any date in a closed trade's event log to swap it
  for a picker, and a Save dates button appears beside the delete control. Per-event rather than a
  pair of summary fields, so each event can be corrected on its own. Rejects an edit that would put
  events out of order, rolling every date back rather than half-applying.
- 2026-08-27 — Navy-and-gold palette: gold on the masthead R and on emphasis through the body
  (#c9a227, 7.5:1 on card ground). The blue accent on buttons, the Cal-says panel and the rail is
  untouched — say the word if that should shift to navy/gold too.
- 2026-08-27 — Sticky section index on the left, wide screens only, with the current section marked.
  Needed trailing scroll room below the last card: without it the final two sections share the
  closing viewport and neither can be isolated or highlighted correctly.
- 2026-08-27 — Live marks re-added: optional Finnhub key, manual refresh, and a one-minute poll that
  holds off while a field is focused. Marks only ever move the last price, never a stop or a size.
- 2026-08-27 — Stop panel rebuilt: labelled "Move stop to" and "Average daily range" rows with the
  current value shown beside each, real placeholders instead of values masquerading as them, and the
  breakeven / 1R-trail shortcuts moved to their own "jump to" row showing the price they apply.
  Those shortcuts now snap to a price you could actually enter as an order, so the button label and
  the level it sets are the same number.
- 2026-08-27 — Dropped the stop field from Adjust (override). Duplicated the Stop panel.
- 2026-08-27 — Loss audit reworked to three causes that call for three different responses:
  *Thesis broken* (nothing to fix), *Stopped by noise* (the stop was too tight), *Rule violation*
  (a word with yourself). Retired "breach": a stop that gaps through shows up as a worse R multiple
  anyway. Added a **Rule violations** stat. A retired tag still on an old trade is kept and labelled.
- 2026-08-27 — Removed the four-button explainer strip at the top: descriptive only, wired to nothing.
- 2026-08-27 — Default portfolios reduced to a single `Trading`.
- 2026-08-27 — Default tier budgets set to A+ 1R / A 0.5R / B 0.25R.
- 2026-08-27 — Removed the per-trade "Custom R" entry field. The three tiers cover it. (The mid-trade
  "Risk budget (R)" control on an open trade card is a different thing and stays.)
- 2026-08-27 — Fixed baseline alignment in the settings grid: controls now sit flush at the bottom of
  each cell, so a two-line label no longer knocks its row out of line.
- 2026-08-27 — Generic placeholders: ticker `xxx`, shares `auto`.
