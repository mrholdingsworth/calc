# Weaknesses register

Every flaw this project has identified in itself, in one place. 41 entries. Compiled 2026-10-24 from
`OPEN-ITEMS.md` (To do, Ruled out and the Decided/done entries, several of which record a weakness
created or left behind by the fix), `index.html`'s own comments, `SESSION-HANDOFF.md`, and the v2
review.

This is a register, not a backlog. `OPEN-ITEMS.md` decides what gets done; this answers "what do we
already know is wrong with it". Most entries here are deliberate trade-offs rather than mistakes,
and that is stated where it applies — a known limitation honestly chosen is not the same as a bug.

Status key: **live** wrong behaviour reachable today · **latent** wrong code not currently reachable
· **by design** chosen, with a cost · **v2** addressed by the v2 plan · **fixed** closed, kept
because the pattern recurs.

---

## Live — wrong behaviour you can hit today

1. **Section collapse state is stored per account.** `collapsed:{...}` lives on `pf.settings`, and
   `renderSections()` reads it off `state`, which is whichever account is in view. An account
   carrying `desk:true` from an earlier session folds the Desk the moment you switch to it. Reported
   as a one-off startup bug; it reproduces every time, and expanding it writes `false`, which is why
   it looked like it never recurred. **Same root cause, still live:** in a group `state` is the
   *first member*, so collapsing a section while a group is open silently writes onto that one
   account. Collapse is a preference about the page, not a property of a book. *Moot after v2
   phase 3.*

2. **`bpUsed` marks at `t.last`.** The one place the tape still reaches into a cost-based number: a
   winner consumes more buying power as it rises, with nothing having been decided. Under *equity
   responds to decisions, never to the tape* it arguably belongs at cost. The wrinkle is that cost
   is right for a cash account while a margin account's maintenance requirement genuinely is marked,
   so it may have to follow `marginX` rather than be one rule. **Still open in v2.**

3. **APTR/ADR is fixed at entry with no correction path.** v1.2.2 removed the setter from the Stop
   box, and `doAdjust` covers quantity and average price only. A mistyped value is permanent on that
   trade, and it silently distorts the weighted figure and the volatility check for as long as the
   position is open. Natural home for a fix is the Adjust panel. *v2 phase 4 gives every transaction
   an edit path, which closes this.*

4. **Loss discipline is measured in account R.** `bookStats` counts losses at or under 1.2 *account*
   R. A half-size trade that blew through its stop by 2× reads −1.0R and passes. Exactly the flaw
   the breach pill had before v1.3 moved it to internal R, and it is a question about stops, so it
   probably wants `rmInt`. Not changed because it moves a published statistic.

5. **Shares (override) is silently ignored in group mode.** The field renders, accepts input, and
   `openGroupTrade` never reads it. Low stakes, but a control that appears to work and does nothing
   is the worst kind. *Dies with v2 phase 5.*

6. **Everything lives in one browser's `localStorage`.** Clearing site data wipes the book. Mitigated
   by the loud save-failure banner and the 6-day backup nudge, not solved — and the nudge only
   counts Download and Copy, because Export to box just puts JSON on screen.

## Latent — wrong code that nothing currently reaches

7. **`deleteTrade` filters `state.trades`, not the trade's own account.** `getTrade` and `acctOf`
   search every portfolio, so the lookup is right and the delete is wrong. Unreachable today only
   because group cards use `gDelete` and `tradeCard` renders in account mode alone. One line. Do it
   before adding any new delete call site — and v2 adds one.

8. **`t.checks` is a fixed four-boolean array, and a statistic depends on its shape.** `bookStats`
   derives "Planned at entry %" from `t.checks.every(Boolean)`. The moment a checklist is
   user-defined and variable in length, that statistic compares trades taken under different
   checklists and quietly means nothing. If checks ever return, the store has to become
   `[{text, ticked}]` so a trade records which questions it was actually asked. *v2 removes the
   checks, which closes this by deletion.*

## By design — chosen, with a cost worth remembering

9. **Realised-only equity is the blind basis, not the conservative one.** The strongest finding in
   the backlog, and it argues against the app as built. Holding a loser stopped $4,000 below average
   reads $100,000 of equity while the floor if that stop hits is $96,000 — **over-sized against the
   floor, not under**. *This is what v2's protected-equity basis fixes.*

10. **The risk budget becomes a target with a tolerance, not a ceiling.** A consequence of
    fuzziness, stated here so it is not discovered by surprise: accepting 1.08R to gain a third of a
    position means per-trade risk can exceed budget by the tolerance. Acceptable because the heat cap
    is the real survival lever and is computed from actual risk, so the overshoot shows up there
    honestly. *New in v2.*

11. **Unguarded long shares sit at a floor of zero, and that is correct.** Not a flaw in the
    protected-equity formula but a property of it that reads as one: 40 unstopped shares contribute
    nothing protected, which shrinks the sizing basis by their full value. That is the truth of the
    position. *New in v2. An unguarded short has no floor at all, so the shipped default refuses new
    positions until a stop is added — a default, changeable in settings, not a rule. Switched off,
    the basis falls back to realised-only while any short is unguarded.*

12. **Max stop width and the 1.5-APTR floor can leave an empty band.** A 12% APTR wants a stop
    around 18% wide, which a 5% max forbids. Two guards that are really one conclusion — *this stock
    is too volatile for your rules* — and it must be said once, not twice. *Live in v2, where both
    guards exist.*

13. **The scratch band is deliberately asymmetric.** `SCRATCH_LO = -0.05`, `SCRATCH_HI = 0.10`: it
    discards more marginal wins than marginal losses, so dropping scratches can never flatter the
    win rate. A declared bias, chosen so the number cannot lie in the comfortable direction.

14. **Weighted APTR reads low when positions lack a value.** Positions with no APTR contribute
    nothing to the figure. Handled by stating the count of them beside it rather than letting it
    quietly read low — the honest version, not a fix.

15. **Statistics are per-account only.** A group picks one member through the dropdown, because no
    statistic is meaningful pooled across accounts of different size. Correct, and it means a group
    has no aggregate performance view at all.

16. **The app records intent; a broker records fills.** The event model is
    `entry / add / trim / close / stop`, and a statement cannot say whether 200 shares leaving at
    104 was a planned trim or a panic. Nor does an import bring tier, concept, APTR, the plan and
    its hinges, or the R unit and equity locked at open. So the honest framing of any import is
    "remove the typing of numbers", never "remove the journalling" — and the journalling was always
    the part that pays.

17. **Daily mark-to-market change cannot be reconstructed backwards.** There are no daily equity
    snapshots, only marks taken whenever a refresh happened to run. Realised P/L per day is free
    from `closedAt`; the marked version is not, and never will be for the past. The only fix is to
    start writing a daily stamp from some release onward. **The one part of the calendar item that
    cannot be retrofitted**, so it wants deciding early.

18. **Three note fields with no defined relationship.** The re-trade note, the 30-day review, and a
    calendar journal would make a fourth. Decide how they relate before building, or the same
    thought gets written in three places and none of them is the one you search.

19. **A theme is not a concept, and folding either into the other loses both.** `concept` is
    structure ("mean reversion"); a theme is narrative ("uranium"). Orthogonal, and one trade
    carries both. Noted because the cheap move is to reuse the field.

20. **APTR migrated from ADR is mislabelled data.** Not the same measure, but the same role, so v2
    carries old values forward rather than nulling them and blanking every existing position's
    figure. The affected trades get a one-time amber flag. *New in v2.*

## Performance

21. **`derive()` replays the full event log and is called from ~26 sites.** `bpFree → bpUsed →
    derive` runs for every open trade, per member, on every keystroke in New Trade. A memo keyed on
    `t.events.length` plus the last event's timestamp would kill most of it.

22. **`render()` rebuilds everything on every action** — all open cards, the whole closed table with
    its textareas, all nine SVG charts. Fine at a few dozen trades. The fix when it matters is
    per-section renderers called only when their section changed.

## Security and data

23. **A broker credential in `localStorage` on a public origin is a different class of secret.** The
    Finnhub key already stored reads quotes; a broker credential reads positions and can sometimes
    place orders. This is the argument that makes CSV import the better answer, not just the easier
    one.

24. **Storage is shared per origin, so two versions of the app fight over one book.** Found while
    planning v2: if v2 wrote to `rcalc.v1`, v1.3's `normalize()` would drop the v2 fields and save
    over them. *Addressed by v2's separate key and one-way import.*

## Method, not code

25. **The pre-trade checks are Russo's, not his** — four checks that do not describe how he trades,
    enforced as a hard gate on the app's primary workflow. `updateGate()` disables Open trade until
    all four are ticked, so every trade requires agreeing to someone else's checklist before it can
    be recorded at all. *Removed in v2 phase 5.*

26. **The rules panel was memoir content in the place his own system should be.** Pulled out,
    parked in `_parked/bible.html`. Same problem as the checks, and if a checklist ever becomes
    user-defined that is the better home for rules than a panel read once.

27. **ADR was serving one of two questions it can answer.** Russo's — is my stop outside the noise,
    bad under ~1.5 — is implemented. His own — am I late, bad over ~0.5 — is not. Orthogonal
    measures sharing a unit, so both are worth having. Still on the backlog.

28. **The app asserts a method, in three ways.** Identified 2026-10-24 as a v1 vestige; v2.0 is
    generic. Warnings speak in the user's voice ("your rule is no new trades until it comes back
    under"). Ten constants hard-code method as doctrine — the scratch band, the APTR noise floor in
    three places, the breach threshold, the loss-discipline line, the loss tags, the target ladder.
    And two whole features were someone else's system, which entries 25 and 26 cover. The first two
    are the live part; see the v2 plan for the constant-by-constant list and which of them should
    become settings rather than defaults.

## Fixed — kept because the pattern recurs

29. **Group mode read the first member only, three separate times.** `refreshMarks`/`pollMarks`,
    the cold-streak brake, and `collapseAll` each reached for `state.trades` and got one account of
    several — falsifying open P/L, heat, buying power and the volatility check everywhere else.
    Fixed individually. The *cause* is live until v2 phase 3 collapses the two renderers into one:
    any control added to shared chrome fails silently in exactly one mode.

30. **Save failures were silent.** Correct on screen, gone on reload, discovered at the next page
    load. Now loud, persistent, and with an export path that bypasses storage entirely. The general
    lesson — the worst failure is the one that looks like success — is why this register exists.

31. **`maxAdd` had no buying-power term.** On a fully deployed $100,000 cash account, a 10c stop
    offered 9,000 more shares of a $100 name — about $900,000 of stock. R answers how much you may
    lose and says nothing about how much you may hold.

32. **The target ladder was the only R figure in the app that ignored realised profit**, so a 33%
    trim moved the target. Found from a number Steve questioned, by solving backwards from it. Then
    fixed twice: v1.2.4 made it whole-sequence, which was right against the old definition, and
    v1.3 discovered the definition itself was the problem.

33. **`esc()` alone was wrong for inline handlers.** It turns `'` into `&#39;`, which the parser
    decodes back before JS parses the attribute, so an apostrophe in an account name broke every
    control on its row. `jsq()` escapes for JS *then* for HTML. Five sites.

34. **A flat 4dp price rule produced unplaceable prices** like 110.2563. The tick now comes from the
    price typed for that trade.

35. **Heat cap and cold streak claimed enforcement the code never had.** Worse than no warning,
    because it invites you to trust it. Both now say "flagged, not blocked" — which is the whole of
    the flag-don't-block invariant, learned from being wrong about it once.

## Found in the v2 review, 2026-10-26

Entries 36 onward. The build is now ahead of the brief on management and
accuracy; these are what the review turned up against it.

36. **The Equity tile claims protected equity and shows realised-only.** The comment on it says
    "cash plus what the open positions are protected at", and I said the same thing in the handover
    message. It is not true: `aum` is cash plus positions **at cost**, moved by closes, trims and
    cash flows. Measured on a 1000-share position at 50 stopped at 46 — the tile reads $100,000
    where protected would be $96,000, a $4,000 gap that grows with every open position.

    **The protected basis from decision 2 is not built at all.** No setting, no logic, nothing
    reading `riskAtStop` into equity. It was settled in principle, recorded as settled, and then
    never implemented — and the comment quietly asserted it had been. *Live, and the most
    misleading thing currently in the app.*

37. **Lot rounding is a setting nothing reads.** It is stored, scoped to the account, has a
    tooltip explaining what it does, and no code consumes it. A control that does nothing is worse
    than an absent one: it invites you to configure a behaviour you are not getting. Either
    `tierSize` rounds to it or the setting goes. *Live.*

38. **Recomputation cost multiplied about fourfold.** Register #21 said `derive()` is called from
    ~26 sites and replays the whole log each time. Pricing every tier instead of one made it worse:
    measured at 12 open positions, a single keystroke in New Trade costs **48 `derive()` calls**,
    and in a group of four accounts the calculator costs **144**. At 0.7–0.9ms it is not felt
    today, and saying otherwise would be alarmism — but the multiplier is real and it scales with
    both the book and the number of accounts. *Live, not yet painful.*

39. **`root.fcTier` does two jobs.** It is the calculator's highlight *and* the tier a new trade is
    filed under. Clicking a cell to compare sizes silently changes the classification of the next
    trade opened. Nothing on screen says so. *Live, by my design, and worth a second look.*

40. **APTR at entry is now editable, which loosens a locked-at-open field.** Deliberate, and it
    closes #3 — a mistyped volatility used to be permanent. But `aptrAtOpen` is the figure the
    volatility history leans on, and it can now be rewritten long after the fact with nothing
    recording that it was. *By design; the asymmetry with the other locked fields is new.*

41. **Dead markup left behind.** The `nt_gate` span survives the checklist that wrote to it, and
    `nt_ladder` is an empty div in single-account mode. Harmless, but they are the sort of thing a
    later reader assumes is load-bearing. *Live, trivial.*

## Closed by v2, as of 2026-10-26

Kept rather than deleted, because the reasoning is why the fix looks the way it does.

- **#1 per-account collapse state** — gone with the tab layout; there is no collapse map.
- **#3 APTR fixed at entry** — the gear edits it, see #40 for what that cost.
- **#4 loss discipline in account R** — moved to internal R when it became a setting.
- **#8 `t.checks` fixed length** — the checklist is gone; the statistic retires with it.
- **#25 pre-trade checks** and **#26 rules panel** — removed; entry asks four questions, all numbers.
- **#28 the app asserts a method** — warnings neutral, constants are settings, the noise check
  ships off. The remaining assertion is the default values themselves, which is unavoidable.

Still open from the original list: **#2 `bpUsed` marks at `t.last`**, **#5 shares override in group
mode** (now moot — shares is a first-class field), **#6 localStorage**, **#7 `deleteTrade` scope**
(still unfixed and phase 4 added the call site that reaches it), **#17 no daily equity stamps**,
**#22 `render()` rebuilds everything** (improved by tabs, not solved), **#27 extension check**.
