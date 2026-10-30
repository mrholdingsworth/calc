# Session handoff — R Calculator

Orientation for a session picking this up cold. Deliberately does **not** repeat the backlog or the
maths: `OPEN-ITEMS.md` is the running list and the decision record, `V2-PLAN.md` holds the v2
decisions, `README.md` is what v1.3 does and why. This file is the layer between them — where things
are, what must not be broken, and what is waiting on Steve rather than on work.

**Two builds, both live.** Rewritten 2026-10-26 for v2.

| | file | URL | storage key |
|---|---|---|---|
| v1.3 — what Steve trades from | `index.html` | <https://mrholdingsworth.github.io/calc/> | `rcalc.v1` |
| v2.0-dev — in development | `v2.html` | <https://mrholdingsworth.github.io/calc/v2.html> | `rcalc.v2` |

**`index.html` is not edited until cutover** (V2-PLAN section 0). v2 reads the v1 book once when its
own key is empty, and on demand from Data › Re-import from v1; it never writes to `rcalc.v1`.

## Read in this order

1. `OPEN-ITEMS.md` — To do, Ruled out, then Decided/done newest-first. Reasons, not just changes.
2. `V2-PLAN.md` — the **"Settled 2026-10-26"**, **"2026-10-27"** and **"2026-10-28"** and **"2026-10-29"**
   sections first (decisions 1–37): they record Steve's answers and
   supersede anything earlier in the file that disagrees, including the outline document.
3. This file.
4. `WEAKNESSES.md` (the register) and `REVIEW-2026-10-26.md` only when you need the history of a
   known flaw. Both are dated records; several entries are now fixed.

The brief itself is outside the repo: `C:\Users\steve\Downloads\Position Size Calculator — Version 2
Ideas.docx` (the I/II/III/IV outline) and `psc-v2-conversation.txt`. Where the outline and a settled
decision disagree, the settled decision wins — Steve made it later.

`_parked/` holds removed v1 features. `_dev/compare.js` is the v1.3-equivalence harness and
`_dev/v2-checks.js` the v2 regression checks — see Working conventions.

## Deploy loop

```
commit -> push -> poll the live URL until it serves the pushed file
```

- No build step. One self-contained HTML file, no dependencies.
- Commit from a message **file** (`git commit -F path`). PowerShell does not pipe a here-string to
  `git commit -F -`; the message becomes a pathspec and nothing is committed.
- Poll by hashing the live file against the local one; Pages takes 15–45s. Do not conclude "not
  live" from a manual check or two.
- Bump the version in the footer and add a Decided/done entry to `OPEN-ITEMS.md` per change.
- The v1.3 artifact (`https://claude.ai/artifact/NkoxRCYRTPZFrVwi1aAofb`) is **not** republished
  until cutover. v2 has no artifact.

## Map of `v2.html`

Section banners (`/* ===== name ===== */`), in file order: state, format, core math, tiny SVG
charts, portfolios, settings, fast calc, cash in and out, new trade, trade card, trade actions,
tally, charts & statistics, group mode, book bar, render, audit ledger, bindings, live marks, clock,
boot. `grep -n '^/\* =' v2.html` prints them with line numbers.

Where the load-bearing pieces live:

- `derive(t)` — replays the event log; everything reads from it.
- `riskAtStop` / `coverage` — what a stop-out costs; unstopped long shares at a $0 stop.
- `aumOf(acct)` — the sizing basis. `rUnitOf` and every percentage of equity read it.
- `tierSize` — the one sizer: Fast calc, the New Trade range and blank-shares fallback, group New
  Trade. A second sizer is how three bugs got in.
- `settingsFor` / `GROUP_KEYS` / `SET_FIELDS` — where a setting lives and who it reaches.
- `migrate2..4` — schema migrations, run from `normalize()`.

## Invariants — break these and the numbers lie

**The book is worked out, never stored.** `bookOf(acct)` = `initialCapital` + every cash flow
(deposit, withdrawal, signed adjustment) + every trade's realised P/L. Nothing writes a balance:
the only hand-typed figure is initial capital, and drift is an `adjust` cash flow (the Adjust
dialog computes it from the broker's cash against `appCash`). Old books' stored `aum` is turned
into a worked-back initial capital once in `normalize()` and deleted.

**AUM is cash + stop × shares.** `aumOf` = `bookOf` less `riskAtStop` over open trades. Side carries the sign for a short. Unstopped long shares count at a
$0 stop; unstopped short shares have no finite worst case, add nothing, and are flagged — and by
default (`shortGuard: "block"`) block new trades in that account. **No net liq, anywhere.**

**Equity responds to decisions, never to the tape.** Closes, trims, stop moves, cash in and out.
Buying power used is at cost for a cash account and at the mark for a margin account, where the
broker's requirement genuinely is marked.

**Estimated tax lives apart.** `taxReport()` works FIFO lots from the event logs and applies wash
sales across all accounts; nothing it does reaches `derive()`, the Portfolio or Closed Trades.
Acceptance of the disclaimer is `root.taxAck = {at, k}`, valid only while `k === ackCode(at)`.

**One sizing rule.** The largest count under the risk budget and max allocation, or one step over
while that overshoot is inside fuzziness. The step is a share, or a lot when lot rounding is on
(per account, default 1). Buying power is a hard limit. Typed shares are never rounded.

**Locked at open, but correctable by hand.** `t.rUnit`, `t.aumAtOpen`, `t.aptrAtOpen`, the entry
event. Nothing recomputes them; the gear lets a person correct a typo in them.

**`syncCompound` no longer moves money** — the book is worked out — but still records
`t.compounded` on every realising path, which the migrations read. **Status follows the shares**:
any path that edits or removes an event calls `syncStatus(t)`, or a closed trade can be left
holding shares.

**Removing a feature removes what *creates* it, never what *reads* it.** Old `add`, `budget` and
`adjust` events must still replay; `t.checks` is still read for old books.

**Two R's.** Internal R (realised ÷ what the position was built to lose) for the breach pill and
loss discipline; account R (`realized ÷ rUnit`) for every other statistic and chart.

**Group warnings are per account.** R is a different number of dollars in each account, so heat and
the cold streak are measured per account and a group shows its heaviest. Never sum R across legs.

**Where settings live.** `root.defs` — taxonomy that must not vary by account (setups, loss tags,
scratch band). `root.ui` — about the page. `GROUP_KEYS` — method, owned by a group when one exists.
`pf.settings` — about one account (margin, lot rounding). A per-account control shown while a whole
group is open would write to its first member; those are hidden there and set per member in the
members table instead.

**Anything hideable is tagged, never branched on.** A part listed in `SHOWABLE` carries the
class `v-<key>` (or is named by its selector there); `applyShow()` hides it with one generated
rule. A new column or tile that should be hideable gets a tag and a `SHOWABLE` entry, and the
`panels` regression case then covers it automatically.

**A figure means one thing everywhere.** Hover explainers come from the one `TIPS` table, keyed by
label text; a new label wants an entry there, and a label reused for a different figure is a bug.
The page script has no build step to catch a syntax slip, and the pane's console stays silent when
the script fails to load — `runChecks` being undefined is the symptom.

**Money has two scales.** `fmt$` cents for every aggregate, `fmtP` up to four decimals per share.
`mask()` returns real characters, not an entity, because masked values reach inputs.

**Flag, don't block** — with one chosen exception, the unstopped-short block, which is a setting.
Warnings state the figure and the threshold. **No coaching text**: no explaining strategy, no
telling the user what to do.

**`jsq()`, not `esc()`, for a value in an inline handler.** Better, pass an index or an id. IDs
are safe to write raw only because `cleanIds()` replaces any that are not `[A-Za-z0-9_-]` on load;
a new kind of stored ID going into a handler needs the same.

**A book from elsewhere is hostile until loaded.** Every stored string is `esc()`'d on the way to
the page; import is tried on the side and swapped in only if it normalizes and renders; the
Content-Security-Policy allows connections to Finnhub only -- a new outside service has to be added
there or it is silently blocked. Backups (`bookJson`) leave the Finnhub key out.

**Accessible by construction.** A button drawn as a symbol needs a `title` (`applyA11y` names it
from that); a field needs a `<label for>` or `aria-label`; a toggle carries `aria-expanded` or
`aria-pressed`; an explainer goes in `TIPS` or an `.info` bubble and becomes a description
automatically. The `a11y` case fails on a nameless field or symbol button on any tab.

**A broker file proposes; the user disposes.** `csvCompare` only reads, `csvProjected` works on a
copy, and `csvApply` applies what its approval function passes -- the screen passes the ticks. A new
kind of difference gets a row and a box, never a silent fix. Text from the file is `esc()`'d like
any stored string; nothing from it is written into a handler (boxes carry their key in `data-k`).

## Waiting on Steve, not on work

- Cutover, once everything else is done. Open heat in R may still be tuned.
- The broker file has only seen thinkorswim's Transaction History. Assignment and expiry rows have
  not appeared yet; when a file has them they list as not read, and that is the next sample to ask for.

## Working conventions

In memory as `r-calculator-conventions`: edit `v2.html` with Edit/Write rather than shell
heredocs (they eat backslashes); `py` for Python; verify in the browser pane programmatically —
build state on `root`, call `render()`, assert on the DOM, wrap test code in
`try{…}catch(e){({err:e.message})}`, and re-navigate after every edit. The pane serves the file as a
`data:` URL, so `localStorage` is unavailable there and nothing a test does is saved.

- **Measure, don't eyeball.** Compare against a hand-computed figure and state the comparison.
- **Reproduce a reported bug before theorising.**
- **Two harnesses, both in `_dev/`, both run from a gitignored probe copy** (build command in each
  file's header). `compare.js` proves v2 still does what v1.3 did. `v2-checks.js` proves v2 still
  does what v2 decided — AUM, sizing, lots, split stops, gear edits, groups, the short block, marks,
  the migrations, the New Trade warnings, built-in tags, colours, labels, stops loaded, buying power, initial capital, tax, Closed
  Trades and Statistics, a sweep of every show/hide item, and the broker file — 342 checks; `runChecks()` returns `{passed, failed}`. **Run
  `v2-checks` before every push**, and when you add a feature, add its case. After editing a case,
  make it fail once on purpose before trusting a clean run.
