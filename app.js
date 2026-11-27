/**
 * CapGain US - 2026 US Capital Gains Tax Calculator Engine
 * 3 Tools:
 *  1) Stocks & Crypto Capital Gains (0%/15%/20% LTCG vs Ordinary STCG + 3.8% NIIT + 50 States + TLH)
 *  2) Real Estate Sale, Section 121 ($250k/$500k), 25% Depreciation Recapture & 1031 Exchange
 *  3) Holding Period Wait-vs-Sell Reverse Breakeven Drop Calculator
 */
(function () {
  "use strict";

  const CFG = window.CAPGAIN_CONFIG || {};
  const TAX = window.US_TAX_DATA || { standardDeduction: {}, federalBrackets: {}, states: [] };

  // 2026 Federal Long-Term Capital Gains Brackets (by Taxable Income)
  const LTCG_BRACKETS = {
    single: [
      { upTo: 49450, rate: 0.00 },
      { upTo: 545500, rate: 0.15 },
      { upTo: Infinity, rate: 0.20 }
    ],
    married: [
      { upTo: 98900, rate: 0.00 },
      { upTo: 613700, rate: 0.15 },
      { upTo: Infinity, rate: 0.20 }
    ],
    hoh: [
      { upTo: 64750, rate: 0.00 },
      { upTo: 566700, rate: 0.15 },
      { upTo: Infinity, rate: 0.20 }
    ]
  };

  const NIIT_THRESHOLDS = {
    single: 200000,
    married: 250000,
    hoh: 200000
  };

  const WA_LTCG_EXEMPTION = 270000;
  const WA_LTCG_RATE = 0.07;

  const TOOL_META = {
    stocks: {
      heading: "2026 US Stocks & Crypto Capital Gains Tax Calculator",
      desc: "Calculate exact 2026 Short-Term vs. Long-Term capital gains tax (0% / 15% / 20%), 3.8% NIIT surtax, all 50 US states + DC, and Tax-Loss Harvesting savings in real time."
    },
    realestate: {
      heading: "2026 Real Estate Capital Gains, Section 121 & 1031 Exchange Calculator",
      desc: "Model primary home sales ($250k / $500k Section 121 exclusion), rental property 25% depreciation recapture, and exact taxes deferred via a 1031 Exchange."
    },
    wait: {
      heading: "Wait-for-Long-Term vs. Sell Today Breakeven Reverse Calculator",
      desc: "Sitting on a short-term stock or crypto gain? Reverse-calculate the exact price drop you can absorb while waiting for Day 366 and still beat selling today."
    }
  };

  const PRESETS = {
    stocks: [
      {
        label: "NVDA Winner (+$85k LTCG · CA)",
        values: { stFiling: "single", stState: "CA", stAsset: "stocks", stTerm: "long", stBuy: 65000, stSell: 150000, stIncome: 145000, stLoss: 0 }
      },
      {
        label: "Crypto Bull Run (+$150k STCG · NY)",
        values: { stFiling: "single", stState: "NY", stAsset: "crypto", stTerm: "short", stBuy: 50000, stSell: 200000, stIncome: 130000, stLoss: 0 }
      },
      {
        label: "0% LTCG Bracket Harvest (+$35k · FL)",
        values: { stFiling: "married", stState: "FL", stAsset: "stocks", stTerm: "long", stBuy: 40000, stSell: 75000, stIncome: 65000, stLoss: 0 }
      },
      {
        label: "Tax-Loss Harvest ($60k Gain · -$25k Loss)",
        values: { stFiling: "single", stState: "CA", stAsset: "stocks", stTerm: "short", stBuy: 80000, stSell: 140000, stIncome: 175000, stLoss: 25000 }
      }
    ],
    realestate: [
      {
        label: "Primary Home (Married · $500k Sec 121)",
        values: { reType: "primary", reFiling: "married", reState: "CA", reIncome: 160000, reBuy: 420000, reImprove: 45000, reSell: 980000, reSellCostPct: 6, reDeprec: 0 }
      },
      {
        label: "Rental Sale + $65k Depreciation (CA)",
        values: { reType: "investment", reFiling: "married", reState: "CA", reIncome: 185000, reBuy: 350000, reImprove: 30000, reSell: 640000, reSellCostPct: 6, reDeprec: 65000 }
      },
      {
        label: "1031 Exchange Rollover ($450k Gain · NY)",
        values: { reType: "investment", reFiling: "single", reState: "NY", reIncome: 210000, reBuy: 400000, reImprove: 50000, reSell: 950000, reSellCostPct: 5, reDeprec: 90000 }
      }
    ],
    wait: [
      {
        label: "High Earner CA ($100k → $220k)",
        values: { wtFiling: "single", wtState: "CA", wtIncome: 180000, wtDays: 275, wtBasis: 100000, wtCurVal: 220000, wtPrice: 150 }
      },
      {
        label: "Crypto 3x Run ($40k → $120k · NY)",
        values: { wtFiling: "single", wtState: "NY", wtIncome: 125000, wtDays: 240, wtBasis: 40000, wtCurVal: 120000, wtPrice: 95000 }
      },
      {
        label: "Moderate Earner TX ($50k → $95k)",
        values: { wtFiling: "married", wtState: "TX", wtIncome: 95000, wtDays: 300, wtBasis: 50000, wtCurVal: 95000, wtPrice: 210 }
      }
    ]
  };

  let activeTool = "stocks";
  let lastStocksRows = [];
  let lastReRows = [];
  let lastWaitRows = [];

  const $ = (id) => document.getElementById(id);

  function fmtUSD(n) {
    const val = Number.isFinite(n) ? n : 0;
    const sign = val < 0 ? "-" : "";
    return sign + "$" + Math.round(Math.abs(val)).toLocaleString("en-US");
  }

  function fmtPrice(n) {
    const val = Number.isFinite(n) ? n : 0;
    if (val >= 1000) return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(n, digits = 1) {
    return (Number.isFinite(n) ? n : 0).toFixed(digits) + "%";
  }

  function numVal(id, fallback = 0) {
    const el = $(id);
    if (!el) return fallback;
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : fallback;
  }

  function showToast(msg) {
    const box = $("toastBox");
    if (!box) return;
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { box.hidden = true; }, 2800);
  }

  /* ================= TAX ENGINE (2026 IRS + 3.8% NIIT + 50 STATES) ================= */

  function getStateObj(code) {
    return (TAX.states || []).find((s) => s.code === code) || { code: "TX", name: "Texas", type: "none", baseRate: 0, topRate: 0 };
  }

  function calcFederalOrdinaryTax(taxableIncome, filing) {
    const inc = Math.max(0, taxableIncome);
    const brackets = (TAX.federalBrackets && TAX.federalBrackets[filing]) || TAX.federalBrackets.single;
    let tax = 0;
    let prev = 0;
    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      if (inc <= prev) break;
      const slice = Math.min(inc, b.upTo) - prev;
      tax += slice * b.rate;
      prev = b.upTo;
    }
    return tax;
  }

  function getMarginalOrdinaryRate(taxableIncome, filing) {
    const inc = Math.max(0, taxableIncome);
    const brackets = (TAX.federalBrackets && TAX.federalBrackets[filing]) || TAX.federalBrackets.single;
    for (let i = 0; i < brackets.length; i++) {
      if (inc <= brackets[i].upTo) return brackets[i].rate;
    }
    return 0.37;
  }

  function calcFederalLTCG(gain, ordinaryTaxableIncome, filing) {
    const g = Math.max(0, gain);
    if (g === 0) return { total: 0, tier0: 0, tier15: 0, tier20: 0 };
    const brackets = LTCG_BRACKETS[filing] || LTCG_BRACKETS.single;
    const base = Math.max(0, ordinaryTaxableIncome);
    const end = base + g;

    let tier0 = 0, tier15 = 0, tier20 = 0;
    let prev = 0;
    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      const lo = Math.max(base, prev);
      const hi = Math.min(end, b.upTo);
      if (hi > lo) {
        const amt = hi - lo;
        if (b.rate === 0) tier0 += amt;
        else if (b.rate === 0.15) tier15 += amt;
        else tier20 += amt;
      }
      prev = b.upTo;
    }
    const total = tier15 * 0.15 + tier20 * 0.20;
    return { total, tier0, tier15, tier20 };
  }

  function calcFederalSTCG(gain, ordinaryTaxableIncome, filing) {
    const g = Math.max(0, gain);
    if (g === 0) return 0;
    const base = Math.max(0, ordinaryTaxableIncome);
    return calcFederalOrdinaryTax(base + g, filing) - calcFederalOrdinaryTax(base, filing);
  }

  function calcNIIT(taxableGain, otherGrossIncome, filing) {
    const g = Math.max(0, taxableGain);
    if (g === 0) return { tax: 0, base: 0, threshold: NIIT_THRESHOLDS[filing] || 200000 };
    const threshold = NIIT_THRESHOLDS[filing] || 200000;
    const magi = Math.max(0, otherGrossIncome) + g;
    const excessMagi = Math.max(0, magi - threshold);
    const base = Math.min(g, excessMagi);
    return { tax: base * 0.038, base, threshold };
  }

  function calcStateIncomeTaxTotal(totalIncome, state) {
    const inc = Math.max(0, totalIncome);
    if (state.type === "none" || inc === 0) return 0;
    if (state.type === "flat") return inc * state.baseRate;
    // Progressive smooth ramp between baseRate ($0-$75k) and topRate ($350k+)
    const ratio = Math.min(1, Math.max(0, (inc - 65000) / 285000));
    const effRate = state.baseRate + (state.topRate - state.baseRate) * ratio * 0.72;
    return inc * effRate;
  }

  function calcStateCapGainTax(taxableGain, otherGrossIncome, stateCode, opts) {
    const g = Math.max(0, taxableGain);
    const state = getStateObj(stateCode);
    if (g === 0) return { tax: 0, note: state.name + " (0%)" };

    // Washington special 7% excise tax on Long-Term Stocks/Crypto > $270k (Real estate exempt)
    if (state.code === "WA") {
      if (opts && opts.isLongTerm && !opts.isRealEstate && g > WA_LTCG_EXEMPTION) {
        const waTax = (g - WA_LTCG_EXEMPTION) * WA_LTCG_RATE;
        return { tax: waTax, note: "WA 7% LTCG Excise Tax (> $270k)" };
      }
      return { tax: 0, note: "Washington (0% under $270k / Real Estate exempt)" };
    }

    if (state.type === "none") {
      return { tax: 0, note: state.name + " (0% state capital gains tax)" };
    }

    const baseInc = Math.max(0, otherGrossIncome);
    const withGain = calcStateIncomeTaxTotal(baseInc + g, state);
    const withoutGain = calcStateIncomeTaxTotal(baseInc, state);
    const tax = Math.max(0, withGain - withoutGain);
    const eff = (tax / g) * 100;
    return { tax, note: `${state.name} (~${eff.toFixed(1)}% marginal)` };
  }

  function evaluateTradeTax(gain, otherGrossIncome, filing, stateCode, isLongTerm) {
    const stdDed = (TAX.standardDeduction && TAX.standardDeduction[filing]) || 16100;
    const ordTaxable = Math.max(0, otherGrossIncome - stdDed);
    const g = Math.max(0, gain);

    let fedTax = 0;
    let ltcgDetail = { total: 0, tier0: 0, tier15: 0, tier20: 0 };
    if (isLongTerm) {
      ltcgDetail = calcFederalLTCG(g, ordTaxable, filing);
      fedTax = ltcgDetail.total;
    } else {
      fedTax = calcFederalSTCG(g, ordTaxable, filing);
    }

    const niit = calcNIIT(g, otherGrossIncome, filing);
    const st = calcStateCapGainTax(g, otherGrossIncome, stateCode, { isLongTerm, isRealEstate: false });
    const totalTax = fedTax + niit.tax + st.tax;
    const effRate = g > 0 ? (totalTax / g) * 100 : 0;

    return { fedTax, ltcgDetail, niit, state: st, totalTax, effRate, ordTaxable };
  }

  /* ================= TAB 1: STOCKS & CRYPTO ================= */

  function computeStocks() {
    const filing = $("stFiling").value;
    const stateCode = $("stState").value;
    const asset = $("stAsset").value;
    const term = $("stTerm").value;
    const isLong = term === "long";

    const buy = Math.max(0, numVal("stBuy", 65000));
    const sell = Math.max(0, numVal("stSell", 150000));
    const income = Math.max(0, numVal("stIncome", 145000));
    const loss = Math.max(0, numVal("stLoss", 0));

    const grossGain = sell - buy;
    const netAfterLoss = grossGain - loss;
    const taxableGain = Math.max(0, netAfterLoss);

    const activeRes = evaluateTradeTax(taxableGain, income, filing, stateCode, isLong);
    const longRes = evaluateTradeTax(taxableGain, income, filing, stateCode, true);
    const shortRes = evaluateTradeTax(taxableGain, income, filing, stateCode, false);

    // Tax-loss harvesting savings calculation
    let tlhSavings = 0;
    let ordDedApplied = 0;
    let lossCarryforward = 0;
    if (loss > 0 && grossGain > 0) {
      const noLossRes = evaluateTradeTax(grossGain, income, filing, stateCode, isLong);
      tlhSavings = Math.max(0, noLossRes.totalTax - activeRes.totalTax);
    }
    if (netAfterLoss < 0) {
      const netLoss = Math.abs(netAfterLoss);
      ordDedApplied = Math.min(3000, netLoss);
      lossCarryforward = Math.max(0, netLoss - 3000);
      const stdDed = (TAX.standardDeduction && TAX.standardDeduction[filing]) || 16100;
      const ordTaxable = Math.max(0, income - stdDed);
      const margRate = getMarginalOrdinaryRate(ordTaxable, filing);
      tlhSavings += ordDedApplied * margRate;
    }

    const netProceeds = sell - activeRes.totalTax;
    const ltVsStDiff = shortRes.totalTax - longRes.totalTax;

    $("stNetProceeds").textContent = fmtUSD(netProceeds);
    $("stSubline").textContent = taxableGain > 0
      ? `Total Capital Gains Tax: ${fmtUSD(activeRes.totalTax)} (${fmtPct(activeRes.effRate)} effective on ${fmtUSD(taxableGain)} gain)`
      : `Capital Gains Tax: $0 (Net capital loss of ${fmtUSD(Math.abs(netAfterLoss))})`;

    const badge = $("stTermBadge");
    badge.textContent = isLong ? "Long-Term (0/15/20%)" : "Short-Term (Ordinary)";
    badge.className = "status-pill tabular " + (isLong ? "pass" : "warn");

    $("stNetGain").textContent = fmtUSD(netAfterLoss);
    $("stFedTax").textContent = fmtUSD(activeRes.fedTax);
    $("stNiitTax").textContent = fmtUSD(activeRes.niit.tax);
    $("stStateTax").textContent = fmtUSD(activeRes.state.tax);

    // Stacked visual bar (Breakdown of Gross Gain or Proceeds)
    const bar = $("stStackBar");
    const legend = $("stStackLegend");
    if (taxableGain > 0) {
      const netProfitKept = Math.max(0, taxableGain - activeRes.totalTax);
      const segs = [
        { label: "Net Profit Kept", val: netProfitKept, color: "#0F766E" },
        { label: "Federal Tax", val: activeRes.fedTax, color: "#DC2626" },
        { label: "3.8% NIIT", val: activeRes.niit.tax, color: "#D97706" },
        { label: "State Tax", val: activeRes.state.tax, color: "#475569" }
      ];
      bar.innerHTML = segs.map((s) => {
        const pct = (s.val / taxableGain) * 100;
        return pct > 0.4 ? `<div class="stack-seg" style="width:${pct.toFixed(2)}%; background:${s.color};" title="${s.label}: ${fmtUSD(s.val)}"></div>` : "";
      }).join("");
      legend.innerHTML = segs.filter((s) => s.val > 0).map((s) => {
        const pct = (s.val / taxableGain) * 100;
        return `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.label}: <strong>${fmtUSD(s.val)}</strong> (${pct.toFixed(1)}%)</span>`;
      }).join("");
    } else {
      bar.innerHTML = `<div class="stack-seg" style="width:100%; background:#0F766E;"></div>`;
      legend.innerHTML = `<span class="legend-item"><span class="legend-dot" style="background:#0F766E"></span>Zero Capital Gains Tax Due ($0)</span>`;
    }

    // Insight box
    const assetLabel = asset === "crypto" ? "Crypto" : "Stock / ETF";
    let insightHtml = "";
    if (netAfterLoss <= 0) {
      insightHtml = `<strong>Net Capital Loss Protection:</strong> You owe <strong>$0</strong> in capital gains tax. You can deduct up to <strong>${fmtUSD(ordDedApplied)}</strong> against ordinary W-2 income this year (saving ~<strong>${fmtUSD(tlhSavings)}</strong>) and carry forward <strong>${fmtUSD(lossCarryforward)}</strong> indefinitely.`;
    } else {
      const holdNote = isLong
        ? `Holding this ${assetLabel} position past 1 year saved you <strong>${fmtUSD(ltVsStDiff)}</strong> compared to selling Short-Term.`
        : `Selling Short-Term costs <strong>${fmtUSD(ltVsStDiff)} MORE</strong> in federal taxes than waiting for Long-Term (&gt; 1 Year). Switch to the <strong>Wait vs. Sell Reverse</strong> tab to see how much price drop you can absorb by waiting.`;
      const tlhNote = loss > 0
        ? `<br><strong>Tax-Loss Harvesting Bonus:</strong> Harvesting ${fmtUSD(loss)} in losses cut your tax bill by <strong>${fmtUSD(tlhSavings)}</strong>.`
        : "";
      const niitNote = activeRes.niit.tax > 0
        ? `<br><strong>3.8% NIIT Triggered:</strong> Your MAGI (${fmtUSD(income + taxableGain)}) exceeds the ${fmtUSD(activeRes.niit.threshold)} IRS threshold, adding ${fmtUSD(activeRes.niit.tax)}.`
        : "";
      insightHtml = `<strong>2026 Tax Verdict (${activeRes.state.note}):</strong> ${holdNote}${tlhNote}${niitNote}`;
    }
    $("stInsightBox").innerHTML = insightHtml;

    // Comparison table
    const rows = [
      ["Federal Capital Gains Tax", fmtUSD(longRes.fedTax), fmtUSD(shortRes.fedTax), fmtUSD(shortRes.fedTax - longRes.fedTax)],
      ["— LTCG 0% / 15% / 20% Slices", `${fmtUSD(longRes.ltcgDetail.tier0)} / ${fmtUSD(longRes.ltcgDetail.tier15)} / ${fmtUSD(longRes.ltcgDetail.tier20)}`, "Taxed at Ordinary Brackets", "—"],
      ["3.8% NIIT Surtax", fmtUSD(longRes.niit.tax), fmtUSD(shortRes.niit.tax), fmtUSD(shortRes.niit.tax - longRes.niit.tax)],
      ["State Tax (" + stateCode + ")", fmtUSD(longRes.state.tax), fmtUSD(shortRes.state.tax), fmtUSD(shortRes.state.tax - longRes.state.tax)],
      ["Total Tax Bill", fmtUSD(longRes.totalTax), fmtUSD(shortRes.totalTax), fmtUSD(ltVsStDiff)],
      ["Net Proceeds Kept", fmtUSD(sell - longRes.totalTax), fmtUSD(sell - shortRes.totalTax), "+" + fmtUSD(ltVsStDiff)]
    ];
    lastStocksRows = rows;
    $("stTableBody").innerHTML = rows.map((r, idx) => {
      const bold = idx >= 4 ? " style='font-weight:700;'" : "";
      return `<tr${bold}><td>${r[0]}</td><td class="num tabular">${r[1]}</td><td class="num tabular">${r[2]}</td><td class="num tabular">${r[3]}</td></tr>`;
    }).join("");
  }

  /* ================= TAB 2: REAL ESTATE, SECTION 121 & 1031 ================= */

  function computeRealEstate() {
    const reType = $("reType").value;
    const isPrimary = reType === "primary";
    const filing = $("reFiling").value;
    const stateCode = $("reState").value;

    const income = Math.max(0, numVal("reIncome", 160000));
    const buy = Math.max(0, numVal("reBuy", 420000));
    const improve = Math.max(0, numVal("reImprove", 45000));
    const sell = Math.max(0, numVal("reSell", 980000));
    const sellCostPct = Math.max(0, Math.min(15, numVal("reSellCostPct", 6)));
    const deprec = Math.max(0, numVal("reDeprec", 0));

    const sellingCosts = sell * (sellCostPct / 100);
    const netSalePrice = Math.max(0, sell - sellingCosts);
    const adjustedBasis = Math.max(0, buy + improve - deprec);
    const realizedGain = Math.max(0, netSalePrice - adjustedBasis);

    // Depreciation recapture (Unrecaptured Section 1250 gain) cannot be excluded by Sec 121
    const recaptureGain = Math.min(deprec, realizedGain);
    const nonRecaptureGain = Math.max(0, realizedGain - recaptureGain);

    const sec121Cap = filing === "married" ? 500000 : 250000;
    const excluded121 = isPrimary ? Math.min(sec121Cap, nonRecaptureGain) : 0;
    const taxableLTCG = Math.max(0, nonRecaptureGain - excluded121);
    const totalTaxableGain = recaptureGain + taxableLTCG;

    const stdDed = (TAX.standardDeduction && TAX.standardDeduction[filing]) || 16100;
    const ordTaxable = Math.max(0, income - stdDed);

    // Unrecaptured Section 1250 Depreciation Recapture taxed at marginal ordinary rate capped at 25%
    const margOrd = getMarginalOrdinaryRate(ordTaxable + recaptureGain, filing);
    const recaptureRate = Math.min(0.25, margOrd);
    const recaptureTax = recaptureGain * recaptureRate;

    // LTCG stacked on top of ordinary taxable + recapture gain
    const ltcgRes = calcFederalLTCG(taxableLTCG, ordTaxable + recaptureGain, filing);
    const niit = calcNIIT(totalTaxableGain, income, filing);
    const st = calcStateCapGainTax(totalTaxableGain, income, stateCode, { isLongTerm: true, isRealEstate: true });

    const totalTax = recaptureTax + ltcgRes.total + niit.tax + st.tax;
    const netCashSell = netSalePrice - totalTax;

    // 1031 Exchange (only applies to investment property)
    const taxDeferred1031 = isPrimary ? 0 : totalTax;
    const buyingPowerBoost = taxDeferred1031 * 4; // 25% down payment leverage

    $("reNetCash").textContent = fmtUSD(netCashSell);
    $("reSubline").textContent = `Selling Costs: ${fmtUSD(sellingCosts)} · Total Tax Bill: ${fmtUSD(totalTax)}`;

    const badge = $("reBadge");
    if (isPrimary) {
      badge.textContent = excluded121 > 0 ? `Sec. 121 Saved ${fmtUSD(excluded121)} Gain` : "Primary Home";
      badge.className = "status-pill pass tabular";
    } else {
      badge.textContent = `1031 Defers ${fmtUSD(taxDeferred1031)}`;
      badge.className = "status-pill warn tabular";
    }

    $("reTotalGain").textContent = fmtUSD(realizedGain);
    $("reExcluded").textContent = fmtUSD(excluded121);
    $("reRecapTax").textContent = fmtUSD(recaptureTax);
    $("reTotalTax").textContent = fmtUSD(totalTax);

    if (isPrimary) {
      const sec121SavedEst = excluded121 > 0
        ? (calcFederalLTCG(excluded121, ordTaxable, filing).total + calcNIIT(excluded121, income, filing).tax + calcStateCapGainTax(excluded121, income, stateCode, { isLongTerm: true, isRealEstate: true }).tax)
        : 0;
      $("reInsightBox").innerHTML = `<strong>Primary Home Section 121 Advantage:</strong> Excluding <strong>${fmtUSD(excluded121)}</strong> of profit under IRS Section 121 saves you roughly <strong>${fmtUSD(sec121SavedEst)}</strong> in combined taxes. Your ${fmtUSD(improve)} in capital improvements also lowered taxable gain dollar-for-dollar.`;
    } else {
      $("reInsightBox").innerHTML = `<strong>Sell vs. 1031 Exchange Verdict:</strong> Selling outright triggers <strong>${fmtUSD(totalTax)}</strong> in combined taxes (including <strong>${fmtUSD(recaptureTax)}</strong> in ${(recaptureRate * 100).toFixed(0)}% Depreciation Recapture). Executing a <strong>1031 Tax-Deferred Exchange</strong> keeps <strong>${fmtUSD(taxDeferred1031)}</strong> working for you — unlocking up to <strong>${fmtUSD(buyingPowerBoost)}</strong> in extra replacement property buying power (at 25% down).`;
    }

    const rows = [
      ["Net Sale Proceeds (After Agent/Closing Costs)", fmtUSD(netSalePrice), isPrimary ? "N/A (Primary Home)" : fmtUSD(netSalePrice)],
      ["Adjusted Cost Basis (Buy + Improvements - Deprec.)", fmtUSD(adjustedBasis), isPrimary ? "N/A" : fmtUSD(adjustedBasis)],
      ["Total Realized Gain", fmtUSD(realizedGain), isPrimary ? "N/A" : fmtUSD(realizedGain)],
      ["Section 121 Primary Home Exclusion", "-" + fmtUSD(excluded121), "$0 (Investment Only)"],
      ["Federal 25% Depreciation Recapture Tax", fmtUSD(recaptureTax), isPrimary ? "N/A" : "$0 (Deferred)"],
      ["Federal LTCG Tax (0% / 15% / 20%)", fmtUSD(ltcgRes.total), isPrimary ? "N/A" : "$0 (Deferred)"],
      ["3.8% NIIT Surtax", fmtUSD(niit.tax), isPrimary ? "N/A" : "$0 (Deferred)"],
      ["State Tax (" + stateCode + ")", fmtUSD(st.tax), isPrimary ? "N/A" : "$0 (Deferred)"],
      ["Total Tax Payable Now", fmtUSD(totalTax), isPrimary ? "N/A" : "$0"],
      ["Net Equity Kept After Sale", fmtUSD(netCashSell), isPrimary ? "N/A" : fmtUSD(netSalePrice) + " (+" + fmtUSD(taxDeferred1031) + ")"]
    ];
    lastReRows = rows;
    $("reTableBody").innerHTML = rows.map((r, idx) => {
      const bold = idx >= 8 ? " style='font-weight:700;'" : "";
      return `<tr${bold}><td>${r[0]}</td><td class="num tabular">${r[1]}</td><td class="num tabular">${r[2]}</td></tr>`;
    }).join("");
  }

  /* ================= TAB 3: WAIT VS SELL REVERSE ================= */

  function computeWaitReverse() {
    const filing = $("wtFiling").value;
    const stateCode = $("wtState").value;
    const income = Math.max(0, numVal("wtIncome", 180000));
    const daysHeld = Math.max(1, Math.min(364, Math.round(numVal("wtDays", 275))));
    const basis = Math.max(100, numVal("wtBasis", 100000));
    const curVal = Math.max(100, numVal("wtCurVal", 220000));
    const curPrice = Math.max(0.01, numVal("wtPrice", 150));

    const daysLeft = 366 - daysHeld;
    const curGain = Math.max(0, curVal - basis);

    const sellToday = evaluateTradeTax(curGain, income, filing, stateCode, false);
    const sellTodayNet = curVal - sellToday.totalTax;

    const waitFlat = evaluateTradeTax(curGain, income, filing, stateCode, true);
    const waitFlatNet = curVal - waitFlat.totalTax;

    const taxSavedFlat = Math.max(0, sellToday.totalTax - waitFlat.totalTax);

    // Reverse-solve exact future value where Long-Term Net Proceeds == Sell Today Net Proceeds
    let breakevenVal = curVal;
    if (curGain > 0 && waitFlatNet > sellTodayNet) {
      let lo = 0;
      let hi = curVal;
      for (let i = 0; i < 48; i++) {
        const mid = (lo + hi) / 2;
        const midGain = Math.max(0, mid - basis);
        const midRes = evaluateTradeTax(midGain, income, filing, stateCode, true);
        const midNet = mid - midRes.totalTax;
        if (midNet >= sellTodayNet) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      breakevenVal = hi;
    }

    const dropPct = curVal > 0 ? Math.max(0, ((curVal - breakevenVal) / curVal) * 100) : 0;
    const breakevenPrice = curVal > 0 ? curPrice * (breakevenVal / curVal) : curPrice;

    $("wtBreakevenDrop").textContent = dropPct > 0 ? `-${dropPct.toFixed(1)}%` : "0.0%";
    $("wtBreakevenPrice").textContent = `Breakeven Floor Price: ${fmtPrice(breakevenPrice)} (Portfolio Value: ${fmtUSD(breakevenVal)})`;
    $("wtDaysLeftBadge").textContent = `${daysLeft} Days to Long-Term`;

    $("wtSellTodayNet").textContent = fmtUSD(sellTodayNet);
    $("wtWaitFlatNet").textContent = fmtUSD(waitFlatNet);
    $("wtTaxSaved").textContent = "+" + fmtUSD(taxSavedFlat);
    $("wtRateDiff").textContent = `${fmtPct(sellToday.effRate)} vs ${fmtPct(waitFlat.effRate)}`;

    if (curGain <= 0) {
      $("wtInsightBox").innerHTML = `<strong>No Unrealized Gain:</strong> Since current value (${fmtUSD(curVal)}) is at or below your cost basis (${fmtUSD(basis)}), waiting for Long-Term tax rates provides no tax advantage. Consider Tax-Loss Harvesting instead.`;
    } else {
      $("wtInsightBox").innerHTML = `<strong>Reverse Breakeven Verdict:</strong> Waiting <strong>${daysLeft} more days</strong> for Long-Term tax status gives you a built-in <strong>-${dropPct.toFixed(1)}% downside cushion</strong>. As long as the price stays above <strong>${fmtPrice(breakevenPrice)}</strong>, waiting beats selling today! If the price stays flat, you pocket an extra <strong>${fmtUSD(taxSavedFlat)}</strong> in pure tax savings.`;
    }

    // Sensitivity stress test table
    const moves = [0.10, 0.0, -0.05, -0.10, -0.15, -0.20];
    // Insert exact breakeven row if within range
    const rows = moves.map((m) => {
      const fVal = curVal * (1 + m);
      const fPrice = curPrice * (1 + m);
      const fGain = Math.max(0, fVal - basis);
      const fRes = evaluateTradeTax(fGain, income, filing, stateCode, true);
      const fNet = fVal - fRes.totalTax;
      const diff = fNet - sellTodayNet;
      const label = m > 0 ? `+${(m * 100).toFixed(0)}% Rally` : (m === 0 ? "0% Flat Price" : `${(m * 100).toFixed(0)}% Pullback`);
      return [
        label,
        fmtPrice(fPrice),
        fmtUSD(fVal),
        fmtUSD(fNet),
        (diff >= 0 ? "+" : "") + fmtUSD(diff) + (diff >= 0 ? " (Wait Wins)" : " (Sell Today Wins)")
      ];
    });
    if (dropPct > 0.1) {
      rows.splice(2, 0, [
        `★ Exact Breakeven (-${dropPct.toFixed(1)}%)`,
        fmtPrice(breakevenPrice),
        fmtUSD(breakevenVal),
        fmtUSD(sellTodayNet),
        "$0 (Exact Tie)"
      ]);
    }
    lastWaitRows = rows;
    $("wtTableBody").innerHTML = rows.map((r) => {
      const isBreak = r[0].startsWith("★");
      const style = isBreak ? " style='font-weight:700; background:rgba(15,118,110,0.08);'" : "";
      return `<tr${style}><td>${r[0]}</td><td class="num tabular">${r[1]}</td><td class="num tabular">${r[2]}</td><td class="num tabular">${r[3]}</td><td class="num tabular">${r[4]}</td></tr>`;
    }).join("");
  }

  /* ================= UI WIRING, PRESETS, SHARE URL & CSV ================= */

  function populateStates() {
    const selects = [$("stState"), $("reState"), $("wtState")];
    const html = (TAX.states || []).map((s) => {
      const suffix = s.type === "none" ? (s.code === "WA" ? " (0% / 7% LTCG >$270k)" : " (0% Tax)") : "";
      return `<option value="${s.code}">${s.name} (${s.code})${suffix}</option>`;
    }).join("");
    selects.forEach((sel) => {
      if (!sel) return;
      sel.innerHTML = html;
      sel.value = "CA";
    });
  }

  function renderPresets() {
    const row = $("quickPresetsRow");
    if (!row) return;
    const list = PRESETS[activeTool] || [];
    row.innerHTML = list.map((p, idx) => `<button type="button" class="preset-chip" data-preset-idx="${idx}">${p.label}</button>`).join("");
    row.querySelectorAll(".preset-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = list[parseInt(btn.dataset.presetIdx, 10)];
        if (!p) return;
        Object.keys(p.values).forEach((k) => {
          const el = $(k);
          if (el) el.value = p.values[k];
        });
        recomputeAll();
        showToast("Loaded scenario: " + p.label);
      });
    });
  }

  function renderOffersAndEcosystem() {
    const grid = $("offersGrid");
    const offers = (CFG.affiliates || []).filter((a) => !a.context || a.context.includes(activeTool));
    if (grid) {
      grid.innerHTML = offers.map((o) => {
        const actionHtml = o.url
          ? `<a class="btn btn-primary btn-sm" href="${o.url}" target="_blank" rel="noopener noreferrer">${o.ctaLabel}</a>`
          : `<details class="checklist-details"><summary>${o.checklistTitle || o.ctaLabel}</summary><ul>${(o.checklist || []).map((c) => `<li>${c}</li>`).join("")}</ul></details>`;
        return `
          <article class="offer-card">
            <span class="offer-badge">${o.badge}</span>
            <h3>${o.title}</h3>
            <p>${o.summary}</p>
            ${actionHtml}
          </article>
        `;
      }).join("");
    }

    // Inline contextual CTA card inside results
    const wealthUrl = CFG.ecosystem && CFG.ecosystem.gumroadWealthOs && CFG.ecosystem.gumroadWealthOs.url;
    document.querySelectorAll("[data-result-cta]").forEach((slot) => {
      if (wealthUrl) {
        slot.innerHTML = `
          <div>
            <strong>Track Every Tax Lot &amp; 366-Day Countdown</strong>
            <span>Pair CapGain US with the 2026 US Personal Finance &amp; Wealth OS Google Sheet.</span>
          </div>
          <a class="btn btn-primary btn-sm" href="${wealthUrl}" target="_blank" rel="noopener noreferrer">Get Wealth OS</a>
        `;
      } else {
        slot.innerHTML = `
          <div>
            <strong>Need a 2026 Tax-Lot &amp; Net Worth Tracker?</strong>
            <span>Preview the companion Google Sheets system built for US investors &amp; high earners.</span>
          </div>
          <button type="button" class="btn btn-sm open-wealth-modal-btn">Preview Sheet OS</button>
        `;
      }
    });
    document.querySelectorAll(".open-wealth-modal-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const dlg = $("wealthOsModal");
        if (dlg && typeof dlg.showModal === "function") dlg.showModal();
      });
    });

    // Ecosystem footer links
    const eco = $("ecoLinksContainer");
    if (eco && CFG.ecosystem) {
      const links = [
        { label: "All Tools Hub", url: CFG.ecosystem.hubUrl },
        { label: "SmartMoney US", url: CFG.ecosystem.smartMoneyUrl },
        { label: "EquityOffer US", url: CFG.ecosystem.equityOfferUrl },
        { label: "PropYield US", url: CFG.ecosystem.propYieldUrl },
        { label: "RetireSmart US", url: CFG.ecosystem.retireSmartUrl },
        { label: "SoloTax US", url: CFG.ecosystem.soloTaxUrl },
        { label: "DebtFree US", url: CFG.ecosystem.debtFreeUrl }
      ];
      eco.innerHTML = links.filter((l) => l.url).map((l) => `<a class="btn btn-sm" href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label}</a>`).join("");
    }
  }

  function switchTool(tool) {
    if (!TOOL_META[tool]) tool = "stocks";
    activeTool = tool;
    document.querySelectorAll(".tool-tab").forEach((t) => {
      const on = t.dataset.tool === tool;
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".calc-panel").forEach((p) => {
      p.hidden = p.id !== "panel-" + tool;
    });
    $("activeToolHeading").textContent = TOOL_META[tool].heading;
    $("activeToolDesc").textContent = TOOL_META[tool].desc;
    renderPresets();
    renderOffersAndEcosystem();
    recomputeAll();
  }

  function recomputeAll() {
    computeStocks();
    computeRealEstate();
    computeWaitReverse();
  }

  function buildShareUrl() {
    const params = new URLSearchParams();
    params.set("tool", activeTool);
    const ids = [
      "stFiling", "stState", "stAsset", "stTerm", "stBuy", "stSell", "stIncome", "stLoss",
      "reType", "reFiling", "reState", "reIncome", "reBuy", "reImprove", "reSell", "reSellCostPct", "reDeprec",
      "wtFiling", "wtState", "wtIncome", "wtDays", "wtBasis", "wtCurVal", "wtPrice"
    ];
    ids.forEach((id) => {
      const el = $(id);
      if (el) params.set(id, el.value);
    });
    return window.location.origin + window.location.pathname + "?" + params.toString();
  }

  function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length === 0) return;
    const stateShortcut = (params.get("state") || "").toUpperCase();
    if (stateShortcut && (TAX.states || []).some((s) => s.code === stateShortcut)) {
      ["stState", "reState", "wtState"].forEach((id) => {
        const el = $(id);
        if (el) el.value = stateShortcut;
      });
    }
    params.forEach((val, key) => {
      if (key === "tool" || key === "state") return;
      const el = $(key);
      if (el) el.value = val;
    });
    const t = params.get("tool");
    if (t && TOOL_META[t]) activeTool = t;
  }

  function downloadCsv(filename, headers, rows) {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(",")].concat(rows.map((r) => r.map(esc).join(","))).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Exported " + filename);
  }

  function initTheme() {
    const saved = localStorage.getItem("capgain_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    const btn = $("themeToggleBtn");
    const syncLabel = () => {
      const cur = document.documentElement.getAttribute("data-theme");
      if (btn) btn.textContent = cur === "dark" ? "Light Mode" : "Dark Mode";
    };
    syncLabel();
    if (btn) {
      btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme");
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("capgain_theme", next);
        syncLabel();
      });
    }
  }

  function initEvents() {
    document.querySelectorAll(".tool-tab").forEach((t) => {
      t.addEventListener("click", () => switchTool(t.dataset.tool));
    });

    document.querySelectorAll("input, select").forEach((el) => {
      el.addEventListener("input", recomputeAll);
      el.addEventListener("change", recomputeAll);
    });

    $("shareLinkBtn").addEventListener("click", () => {
      const url = buildShareUrl();
      window.history.replaceState({}, "", url);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => showToast("Shareable link copied to clipboard!")).catch(() => showToast("URL updated in address bar."));
      } else {
        showToast("URL updated in address bar.");
      }
    });

    $("copyScenarioBtn").addEventListener("click", () => {
      let summary = "";
      if (activeTool === "stocks") {
        summary = `CapGain US (2026 Stocks & Crypto): Net Proceeds ${$("stNetProceeds").textContent} | ${$("stSubline").textContent}`;
      } else if (activeTool === "realestate") {
        summary = `CapGain US (2026 Real Estate): Net Cash ${$("reNetCash").textContent} | ${$("reSubline").textContent}`;
      } else {
        summary = `CapGain US (Wait vs Sell): Max Breakeven Drop ${$("wtBreakevenDrop").textContent} | ${$("wtBreakevenPrice").textContent}`;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summary).then(() => showToast("Summary copied to clipboard!")).catch(() => showToast(summary));
      } else {
        showToast(summary);
      }
    });

    $("printReportBtn").addEventListener("click", () => window.print());

    $("resetDefaultsBtn").addEventListener("click", () => {
      const first = (PRESETS[activeTool] || [])[0];
      if (first) {
        Object.keys(first.values).forEach((k) => {
          const el = $(k);
          if (el) el.value = first.values[k];
        });
      }
      window.history.replaceState({}, "", window.location.pathname);
      recomputeAll();
      showToast("Reset to 2026 default scenario.");
    });

    $("exportStocksCsvBtn").addEventListener("click", () => {
      downloadCsv("capgain-us-stocks-crypto-2026.csv", ["Tax Component", "Long-Term (>1 Yr)", "Short-Term (<=1 Yr)", "Long-Term Savings"], lastStocksRows);
    });
    $("exportReCsvBtn").addEventListener("click", () => {
      downloadCsv("capgain-us-real-estate-1031-2026.csv", ["Line Item", "Sell & Pay Tax Today", "1031 Exchange"], lastReRows);
    });
    $("exportWaitCsvBtn").addEventListener("click", () => {
      downloadCsv("capgain-us-wait-vs-sell-2026.csv", ["Price Scenario", "Future Price", "Gross Value", "Long-Term Net", "vs Sell Today"], lastWaitRows);
    });

    const dlg = $("wealthOsModal");
    if (dlg) {
      $("closeModalBtn").addEventListener("click", () => dlg.close());
      $("modalCloseFooterBtn").addEventListener("click", () => dlg.close());
      $("modalPrintBtn").addEventListener("click", () => { dlg.close(); window.print(); });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateStates();
    initTheme();
    loadFromUrl();
    initEvents();
    switchTool(activeTool);
  });
})();
