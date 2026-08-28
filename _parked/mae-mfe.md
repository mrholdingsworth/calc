# MAE / MFE — removed 2026-08-28

Pulled because it only tells the truth with a live market feed. The app only ever sees prices you
typed or marked, so the envelope understates the real excursion and the numbers flatter you.

`touchExtremes()` and the `hi` / `lo` fields on a trade were **kept**, so the envelope keeps
accumulating quietly. If this comes back with real intraday data, the history will be there.

Definitions used, for a rebuild:

    riskPS = side * (entryPrice - entryStop)        // 1R per share, at entry
    MFE    = max(0, side * (favourableExtreme - entryPrice) / riskPS)
    MAE    = min(0, side * (adverseExtreme    - entryPrice) / riskPS)
    exitR  = side * (weightedAvgExitPrice - entryPrice) / riskPS
    capture = exitR / MFE                            // winners only; losers make it meaningless

Note the basis: MAE/MFE divides by *per-share* entry risk, not the account R unit. That makes
excursion comparable across trade sizes but puts it on a different scale from the R multiple
column — which is exactly why the capture stat was wrong the first time it was written.

Removed UI: a `MAE/MFE` column in the closed table, an excursion panel (editable high/low plus a
capture readout) in the expanded row, and an `MFE captured` tile in the statistics panel.
