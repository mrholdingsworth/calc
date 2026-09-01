# Open items

Running list. Newest at the top of each section.

## To do

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
