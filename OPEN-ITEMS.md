# Open items

Running list. Newest at the top of each section.

## To do

- **30-day review on closed trades.** Every closed trade gets a `30 day review` field for notes
  written a month after the close — did it keep going without you, or did the exit hold up? The
  point is catching two specific failures the immediate post-trade note cannot see: cutting winners
  early, and being shaken out of something that went on to work.

  Highlight the row in a brighter blue once `closedAt + 30 days` has passed and the field is still
  empty; clear the highlight as soon as it has content. That way the queue is visible rather than
  remembered.

  To settle at build time: the blue has to out-signal the existing accents without reading as an
  error — the palette already spends blue on buttons and the Cal-says panel, so this may want its
  own tone rather than the accent. Also worth a count in the section header ("3 reviews due") so it
  is visible while section 04 is collapsed.

- **Wash sales / adjusted tax basis — decide whether it is worth doing at all.** Raised 2026-08-28,
  explicitly as a question rather than a decision.

  The case against: this is a process tool denominated in R, not a tax ledger. It has no concept of
  lots, cost basis carried between trades, or "substantially identical" securities, and your broker's
  1099-B already computes wash sales properly. Half-implementing it produces numbers that look
  authoritative and are wrong, which is worse than not having them.

  The case for: the *flag* is useful even if the accounting is not. Re-entering a name within 30 days
  of taking a loss in it is a process signal — often revenge re-entry — and this app already has the
  dates and tickers needed to spot it. That version costs little and stays inside what the tool
  claims to measure.

  Suggested split when we get to it: build the flag, skip the basis maths.

- **MAE / MFE — re-add if a live data feed arrives.** Pulled 2026-08-28: without intraday data the
  app only sees prices you typed, so the excursion envelope understates and the numbers flatter you.
  The hi/lo envelope still accrues quietly in the background, and `_parked/mae-mfe.md` holds the
  definitions and the basis caveat for a rebuild.

- **Account group calculations.** Several accounts running the same ruleset should take a trade
  once, not once each. Enter ticker, side, tier, entry, stop, ADR and concept a single time; each
  account in the group sizes it off its *own* equity, so each gets its own 1R and its own share
  count from the same risk-per-share.

  Distinct from today's portfolio tabs, which are independent books entered separately. A group is
  one ruleset fanned out across member accounts.

  **Design settled 2026-08-27:**
  - **Shared:** the ruleset — R%, tier budgets, and the survival levers. **Per account:** equity,
    positions, share counts, and all performance statistics.
  - **The whole lifecycle fans out**, not just the opening size. Open, mark, move stops, add, trim,
    close — a group action broadcasts to every member. (This is load-bearing: a stop move recomputes
    the constant-risk add for each account, so if only the entry fanned out the group would
    desynchronise at the first add.)
  - **Any account can also be driven on its own.** Drill into a single member and act on just that
    one — close a position to raise cash for a withdrawal, take a different fill, update equity for a
    deposit. Group actions are a convenience, never a cage.
  - **Model: N linked records, one per account** — not one record with per-account legs. Falls out of
    the two decisions above: no group-level performance rollup is wanted, and members must be free to
    diverge. A group action is a broadcast that writes each account's own record; from then on each
    record lives its own life. Per-account fills need no special field — divergence is just the
    normal per-account path.
  - **No group performance tracking.** Statistics stay per account. A group is a mechanism for
    entering and managing trades, not a reporting unit.
  - **Heat cap is per account only.** Consistent with R already being a percentage of each account's
    own equity.
  - **An account that floors to 0 shares is skipped with a note**, in the same spirit as the current
    entry form's inline feedback — surfaced in the sizing preview before you commit, not silently.

  Implementation note: accounts map onto today's portfolio tabs. Grouping hoists the ruleset from the
  portfolio up to the group, leaving the portfolio holding equity and trades. Ungrouped portfolios
  must keep their own settings, so this needs a migration path rather than a straight move.

- **Name the thing.** The masthead is a plain placeholder for now. Needs a real name, at which
  point these change together: the masthead, the `<title>`, the "CAL SAYS" panel heading, and the
  repo/URL if you want them to match.
- **Rules panel — rebuild around your own system.** The paraphrased seven-part "bible" was pulled
  out of the page. The original markup is parked in `_parked/bible.html` so nothing is lost.
  Re-add later, rewritten to your own rules rather than the memoir's.

## Decided / done

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
