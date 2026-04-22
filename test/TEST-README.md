# Test dataset — Comparative Line Chart

Two equivalent ways to feed the visual:

- `sales-vs-budget.pq` — Power Query M script with **inline data** (zero-setup).
- `sales-vs-budget-2024-2025.csv` — same data as CSV for classic "Get Data".

24 monthly rows for **2024-2025**, crafted to show off every feature:

| Period                      | Pattern                                            | What to look for in the visual |
| --------------------------- | -------------------------------------------------- | ------------------------------ |
| Jan–Jun 2024                | Steady ramp, Actual ≈ Budget                       | Lines hugging each other       |
| **Jul 2024**                | Supply-chain hit on Actual (−30% month)            | Sharp dip in the cumul gap     |
| Aug–Sep 2024                | Recovery                                           | Lines closing                  |
| **Oct–Dec 2024**            | Black Friday + holiday surge                       | Actual sprints ahead           |
| Jan–Feb 2025                | Post-holiday correction                            | Small Actual drop              |
| Mar–Dec 2025                | Progressive outperformance                         | Gap widens steadily            |

**Cumulative totals at year-end**

|       | End of 2024 | End of 2025 |
| ----- | ----------: | ----------: |
| Actual | 749 000 | 1 726 000 |
| Budget | 711 000 | 1 617 000 |
| Delta | **+5.3 %** | **+6.7 %** |

**Interesting sub-periods to drag the comparison handles onto**
- **Jul → Sep 2024** → −15 % vs Budget (the dip).
- **Oct → Dec 2024** → +23 % vs Budget (Black Friday + holidays).
- **Jul → Dec 2025** → +13 % vs Budget (progressive divergence).

---

## Build a test .pbix in 3 minutes

1. Open **Power BI Desktop** (Dec 2023 or later).
2. **Home → Transform data** (opens Power Query Editor).
3. **New Source → Blank Query**.
4. **Home → Advanced Editor** → paste the entire content of `sales-vs-budget.pq` → **Done**.
5. Rename the query to `Sales` if you like → **Close & Apply**.
6. On the Visualizations pane, click **"..." → Get more visuals → Import a visual from a file** → select the `.pbiviz` in `../dist/`.
7. Drop the **Comparative Line Chart** onto the canvas.
8. Drag fields onto the wells:
   - `Month` → **Period**
   - `Actual` → **Series A**
   - `Budget` → **Series B**
9. The chart lights up. Toggle **Comparison** on and drag the handles — the side panel recomputes cumul A, cumul B and the delta instantly.

**Recommended complementary visuals** (to showcase the cross-filtering reactivity claimed in the README):

- A **date slicer** on `Month` — slide it to 6 months and watch the cumul re-baseline.
- A **table** with `Month`, `Actual`, `Budget` next to the visual — click rows to cross-filter.

### Required: hints & tips inside the .pbix

Microsoft's AppSource validation (policy **1180.2.3.1**) asks the sample file to
contain **written guidance** on how to use the visual. Add the following as
**text boxes** on the report canvas (Home → Text box) before saving:

1. **Title text box** (top of the page)
   > **Comparative Line Chart — Sales vs Budget demo**
   > Drag the two handles on the chart to isolate any sub-period; the side panel
   > recomputes the cumulative totals and the delta for you. Toggle the pill
   > next to the legend to switch comparison mode on/off.

2. **Below the chart** (step-by-step)
   > 1. Click the pill → **Comparison** ON.
   > 2. Drag the **"from"** handle to **Jul 2024** and the **"to"** handle to
   >    **Sep 2024** → the side panel shows a **−15 %** delta (the supply-chain
   >    dip).
   > 3. Move **"to"** to **Dec 2024** → delta jumps to **+23 %** (Black Friday
   >    + holidays).
   > 4. Use the **Month** slicer to filter the dataset — the chart rebases.

3. **Formatting hint** (next to the visual)
   > The **Format pane** exposes 13 cards. Try **Data labels → Series A / B**
   > to reveal per-point values with automatic collision avoidance, or
   > **Axes & grid → Y ticks** to rebalance the grid density.

Save as **`ComparativeLineChart-sample.pbix`** — this is the file Microsoft asks
for at certification time.

---

## Certification-ready checklist (before submission)

- [ ] Open the `.pbix` fresh on another machine — visual imports, data loads, chart renders.
- [ ] Resize the visual to 200×150 px → nothing breaks, the welcome page doesn't get stuck.
- [ ] Resize to 1920×1080 → labels don't overlap, padding scales well.
- [ ] Toggle comparison on and off several times.
- [ ] Drag the two handles across each other (reverse range).
- [ ] Add a date slicer, filter to 3 months, confirm the visual follows.
- [ ] Switch Power BI theme to "Frame" (dark) → verify custom colours still readable.
- [ ] Focus mode → visual still interactive.
- [ ] Export the report as PDF → chart renders to PDF.
- [ ] Export report data → CSV contains the bound fields.
- [ ] Open the format pane, browse all 13 cards, check for missing labels.
- [ ] Enable Series A & B data labels; verify collision avoidance works.
- [ ] Apply a manual X/Y offset on a label; verify it's respected.
