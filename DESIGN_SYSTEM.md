# DESIGN_SYSTEM.md — CapGain US (SP #10)

## 1. Visual Identity & Aesthetic Direction
- **Brand:** CapGain US — 2026 US Capital Gains Tax Calculator (Stocks, Crypto & Real Estate)
- **Editorial Tone:** Wall Street / Tax CPA Utility — clean warm-paper canvas (`#F7F7F5`), crisp hairline borders (`#E4E6E8`), authoritative deep teal accent (`#0F766E`) paired with financial emerald (`#15803D`) and tax-alert amber/crimson (`#B45309` / `#DC2626`).
- **Typography:** `Newsreader` (editorial serif for hero numbers & headlines) + `IBM Plex Sans` (UI controls, tables, tabular-nums alignment).

## 2. Locked Layout & Mobile 390px Contract (Zero Regressions)
- **Header (`<= 60px`, 1 row on 390px Mobile):** Brand mark + concise title + 1-line truncated subtitle (`max-width: 190px`) + `Dark Mode` toggle strictly on the same horizontal row (`flex-wrap: nowrap`).
- **Tool Navigation & Presets:** Horizontal single-row scrollable strips on mobile (`overflow-x: auto; flex-wrap: nowrap`).
- **Action Bar (`Share / Copy / Print / Reset`):** Strictly 1 row on both Desktop `1440px` and Mobile `390px`.
- **Form Grids:** All multi-column input rows enforce `align-items: end` so input boxes sit flush on the exact same baseline.
- **Zero "Coming Soon" / "(Soon)":** Every secondary card is an immediately actionable 2026 tax strategy checklist (`<details>`) plus a live modal preview for the companion Google Sheets system.

## 3. Core Interactive Features
1. **Tab 1 — Stocks & Crypto Capital Gains:** 2026 Federal LTCG (`0% / 15% / 20%`) vs. STCG Ordinary brackets, 3.8% NIIT (`$200k/$250k` MAGI), 50-State + DC taxes (including WA 7% LTCG > `$270k`), and Tax-Loss Harvesting savings + `$3,000` ordinary deduction & carryforward.
2. **Tab 2 — Real Estate Sale, Section 121 & 1031 Exchange:** Primary Home (`$250k/$500k` Section 121 exclusion), Rental Property (`≤ 25%` Section 1250 Depreciation Recapture), and side-by-side **Sell & Pay Tax vs. 1031 Tax-Deferred Exchange**.
3. **Tab 3 — Holding Period Wait-vs-Sell Reverse:** Reverse-calculates the exact **Breakeven Max Price Drop (`%` & `$`)** a stock or crypto position can absorb while waiting for 366-day Long-Term status and still beat selling today at Short-Term rates.
4. **Utilities:** Shareable URL state (`?tool=...`), Copy Summary, Print/PDF report, Export CSV, and Dark/Light mode persistence.
