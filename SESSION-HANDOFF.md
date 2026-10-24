# Session handoff — R Calculator

Orientation for a session picking this up cold. Deliberately does **not** repeat the backlog or the
maths: `OPEN-ITEMS.md` is the running list and the decision record, `README.md` is what the app does
and why. This file is the layer between them — where things are, what must not be broken, and what
is waiting on Steve rather than on work.

**Current: v1.3.** One file, `index.html`, ~3,200 lines, no build step, no dependencies.
Repo `mrholdingsworth/calc`, live at <https://mrholdingsworth.github.io/calc/>.

## Read in this order

1. `OPEN-ITEMS.md` — To do, Ruled out, then Decided/done newest-first. The done entries carry the
   *reasoning*, not just the change; several record why an obvious-looking approach was wrong.
2. This file.
3. `README.md` only when touching the maths.

`_parked/` holds removed features (`bible.html`, `live-marks.js`). Nothing in it is live.

## Deploy loop

Every change ships the same way. Nothing is "done" until Pages serves it.

```bash
# 1. commit and push
git add -A && git commit -F - <<'MSG'
<subject>

<body: what changed and why the obvious alternative was wrong>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
git push -q origin main
```

```bash
# 2. rebuild the artifact copy (strips the document wrapper, retitles line 1)
OUT="$SCRATCHPAD/r-calculator.html"
grep -vE '^(<!doctype html>|<html lang="en">|<head>|</head>|<body>|</body>|</html>|<meta (charset|name="(viewport|description|color-scheme)")|<link rel="icon")' index.html > "$OUT"
sed -i '1s#.*#<title>R Calculator</title>#' "$OUT"
```

3. Publish it with the **Artifact** tool to the existing URL — never without `url`, or it forks a
   second artifact: `https://claude.ai/artifact/NkoxRCYRTPZFrVwi1aAofb`, `icon: "chart"`.
4. Poll Pages in the background until the new build is served, grepping for a string unique to the
   change. 15–45s typically. Do not conclude "not live" from two manual checks.

Bump the version in the footer (`version <span class="vbar">|</span> …`) with each release, and add
a Decided/done entry to `OPEN-ITEMS.md`.

## Map of `index.html`

Section banners (`/* ===== name ===== */`) in file order:

| | | | |
|---|---|---|---|
| state | format | core math | tiny SVG charts |
| portfolios | settings | fast calc | cash in and out |
| new trade | trade card | trade actions | tally |
| charts & statistics | group mode | book bar | render |
| bindings | live marks | clock | section index |

`grep -n '^/\* =' index.html` prints them with line numbers.

## Invariants — break these and the numbers lie

**Locked at open, never recomputed.** `t.rUnit`, `t.aumAtOpen`, `t.adrAtOpen`, and the entry
event's price/stop/qty. Every statistic measures against what was true when the trade opened, so
changing equity or ADR later must never reach backwards.

**`t.compounded` tracks how much of a trade's realised P/L is already inside `aum`.** Any new path
that realises anything must go through `syncCompound(t, acct)`. Six already do — trim, close, undo,
adjust, and both group equivalents. Miss one and equity silently double-counts or drops money.

**Removing a feature removes what *creates* it, never what *reads* it.** Adds and the risk-budget
control are gone, but `derive()`, `stats()` deployed capital and both event-log renderers still
understand `type:"add"` and `type:"budget"`, and `plan.addIf` still displays. Old books must replay
unchanged. Verified case: entry 100@100 → add 100@110 → trim 50@115 gives Q=150, avg=105,
realized=$500.

**Two R's, and the statistics use one of them.** *Internal* R is the trade's own risk per share —
targets are `entry + k × riskPerShare` and never move. *Account* R is `realized ÷ rUnit`. Closed
trades show both; **every chart and statistic uses account R**. Do not quietly mix them.

**Equity responds to decisions, never to the tape.** Closes, trims, stop moves, cash in and out.
Unrealised P/L never moves `aum`. The one remaining leak is `bpUsed`, which marks at `t.last` — a
known open question, see the protected-equity item.

**Money has three scales**: `fmtE` whole dollars for equity and buying power, `fmt$` exactly cents
for aggregates, `fmtP` up to four decimals for anything per share. Risk-per-share is a *price* —
rounding it to cents prints `$0.00` on a sub-penny name.

**Group mode is a separate set of renderers.** `groupTradeCard`, `renderGroupNewTrade`,
`renderGroupClosed`. A control added to the shared chrome must be taught both modes or it fails
silently in exactly one. This has bitten three times: `collapseAll`, `refreshMarks`, the cold-streak
brake.

**Flag, don't block.** Heat cap, cold streak, wash sale, over-withdrawal all warn and say plainly
that they are not stopping you. Never write a warning that claims an enforcement the code lacks.

**`jsq()`, not `esc()`, for a value going into an inline handler.** `esc()` alone turns `'` into
`&#39;`, which the parser decodes back before JS parses the attribute. Better still, pass a row
index and look the value up.

## Waiting on Steve, not on work

Raised and deliberately left open. Do not just pick one.

- **Loss discipline is still measured in account R.** Same blind spot the breach pill lost in v1.3:
  a half-size trade that blew through its stop by 2× reads −1.0R account and passes the ≤1.2 test.
  It is a question about stops, so it probably wants `rmInt`. Moves a published statistic.
- **ADR is fixed at entry** since v1.2.2 removed the setter. A mistyped ADR is permanent on that
  trade. Natural home for a fix is the Adjust panel in the event log.
- **Pre-trade checks** — Russo's, not his, and a hard gate on the primary workflow. Three paths were
  put to him (user-defined and blocking, user-defined and warning, removed) and he deferred. Closes
  the rules-panel item if the checklist becomes user-defined.
- **Protected-equity sizing** — fully specified and unblocked since removing adds dissolved the
  double-count. Needs a go-ahead, plus the `bpUsed` cost-vs-mark decision inside it.
- **Naming the app.** The masthead is still a placeholder.

## Working conventions

In memory as `r-calculator-conventions`, and they matter: edit with Edit/Write rather than shell
heredocs (heredocs eat backslashes), `py` not `python`, and verify in the browser pane
programmatically — build state on `root`, call `render()`, assert on the DOM, and always wrap test
code in `try{…}catch(e){({err:e.message})}` because an uncaught error echoes the whole `data:` URL.
Re-navigate after every edit; the pane serves a stale snapshot otherwise.

Two more worth knowing:

- **Measure, don't eyeball.** Every layout claim in the done log was checked by reading
  `getBoundingClientRect()` — row counts, overflow, wrapping. A `<select>` sits half a pixel off its
  neighbours, so compare spreads rather than equality.
- **Reproduce a reported bug before theorising.** The v1.2.4 and v1.3 work both started from a
  number Steve questioned, and in both cases solving backwards from that number found the cause
  faster than reading the code would have.
