# Open items

Running list. Newest at the top of each section.

## To do

- **Account group calculations.** Several accounts running the same ruleset should take a trade
  once, not once each. Enter ticker, side, tier, entry, stop, ADR and concept a single time; each
  account in the group sizes it off its *own* equity, so each gets its own 1R and its own share
  count from the same risk-per-share.

  Distinct from today's portfolio tabs, which are independent books entered separately. A group is
  one ruleset fanned out across member accounts.

  Settled by the request: the ruleset (R%, tiers, and the survival levers) is shared across the
  group; equity is per account; share counts are floored per account.

  Still to decide when this gets built:
  - Does the whole lifecycle fan out, or only the opening size? A stop move re-sizes the constant-risk
    add for every member, so adds/trims/stop moves almost certainly have to fan out too — otherwise
    the group desynchronises after the first add.
  - One trade record with per-account legs, or N linked records? Legs keep the tally aggregatable in
    R (every member should post the same R multiple if it scales cleanly); linked records are simpler
    but make group-level stats a join.
  - Fills differ per account in practice. Allow a per-account actual fill price, or assume one price
    and let the override field handle exceptions?
  - Is the heat cap per account or across the group? Per account is the consistent reading, since R
    is already a percentage of each account's own equity.
  - Small accounts will floor to 0 shares on wide stops. Flag it, or silently skip that member?

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
