# Open items

Running list. Newest at the top of each section.

## To do

- **Targets, reworked.** The R-multiple target ladder was pulled from both the new-trade preview and
  the open-position card on 2026-08-28. Rebuild it as something that earns its space � the old
  version was a static row of +1R/+2R/+3R/+5R prices that never fed a decision.

- **Name the thing.** The masthead is a plain placeholder for now. Needs a real name, at which
  point the masthead, the `<title>` and (if you want them to match) the repo/URL change together.
  The in-app "Cal" references are already gone.
- **Rules panel — rebuild around your own system.** The paraphrased seven-part "bible" was pulled
  out of the page. The original markup is parked in `_parked/bible.html` so nothing is lost.
  Re-add later, rewritten to your own rules rather than the memoir's.

## Decided / done

- 2026-08-28 — **Account groups built.** Groups sit in the tab strip with a leading dot and open out
  into a bordered box holding their member accounts; grouped accounts no longer appear as top-level
  tabs. The desk shows the shared ruleset plus a per-account equity table. New Trade lists one row
  per account with a tick box, equity, 1R, risk, shares, cost and allocation, and names any account
  that sizes to zero. Open Positions render one card per group trade with a row per account across
  Stop, Last, Open P/L, Open P/L %%, Equity P/L %%, Realized, Seq at stop, Total, Cost, Value and
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
