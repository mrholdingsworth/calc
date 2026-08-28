# Open items

Running list. Newest at the top of each section.

## To do

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
- **Live marks — possible re-add.** Finnhub quote polling was removed. It only ever worked on the
  hosted page (sandboxed previews block outbound requests). The removed implementation is parked
  in `_parked/live-marks.js` if it comes back.

## Decided / done

- 2026-08-27 — Removed the four-button explainer strip at the top: descriptive only, wired to nothing.
- 2026-08-27 — Default portfolios reduced to a single `Trading`.
- 2026-08-27 — Default tier budgets set to A+ 1R / A 0.5R / B 0.25R.
- 2026-08-27 — Removed the per-trade "Custom R" entry field. The three tiers cover it. (The mid-trade
  "Risk budget (R)" control on an open trade card is a different thing and stays.)
- 2026-08-27 — Fixed baseline alignment in the settings grid: controls now sit flush at the bottom of
  each cell, so a two-line label no longer knocks its row out of line.
- 2026-08-27 — Generic placeholders: ticker `xxx`, shares `auto`.
