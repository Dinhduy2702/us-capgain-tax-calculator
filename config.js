/**
 * CapGain US - 2026 US Capital Gains Tax Calculator (Stocks, Crypto & Real Estate)
 * SINGLE CONFIGURATION FILE FOR AFFILIATE PLAYBOOKS & ECOSYSTEM LINKS
 */
window.CAPGAIN_CONFIG = {
  brand: {
    name: "CapGain US",
    subtitle: "2026 Capital Gains, NIIT & 1031 Tax Planner",
    year: "2026"
  },
  ecosystem: {
    hubUrl: "https://dinhduy2702.github.io/us-finance-toolkit-hub/",
    smartMoneyUrl: "https://dinhduy2702.github.io/us-smart-money-calculators/",
    debtFreeUrl: "https://dinhduy2702.github.io/us-debt-free-planner/",
    soloTaxUrl: "https://dinhduy2702.github.io/us-solotax-planner/",
    propYieldUrl: "https://dinhduy2702.github.io/us-propyield-analyzer/",
    retireSmartUrl: "https://dinhduy2702.github.io/us-retiresmart-planner/",
    equityOfferUrl: "https://dinhduy2702.github.io/us-equity-offer-calculator/",
    gumroadWealthOs: {
      label: "US Personal Finance & Wealth OS (2026 Sheets)",
      url: "" // AGY 5 dien link Gumroad SP #2 khi xong
    }
  },
  affiliates: [
    {
      id: "zero-ltcg-harvest",
      context: ["stocks", "realestate", "wait"],
      badge: "0% Tax Bracket",
      title: "Tax-Gain Harvesting inside the 2026 0% LTCG Bracket",
      summary: "Single filers up to $48,350 and Married couples up to $96,700 in taxable income pay 0% federal tax on Long-Term Capital Gains.",
      ctaLabel: "Open 0% LTCG Playbook",
      checklistTitle: "0% LTCG Bracket Harvesting Checklist",
      checklist: [
        "Remember the 0% threshold applies to Taxable Income (after the $15,000 Single / $30,000 Married standard deduction).",
        "In a low-income gap year or early retirement, sell appreciated long-term stocks and immediately rebuy them to step up cost basis tax-free.",
        "There is NO Wash-Sale rule on capital GAINS — you can rebuy the exact same ETF seconds later.",
        "Always check your state tax rules first (CA/NY still tax capital gains as ordinary state income even if federal tax is 0%)."
      ],
      url: ""
    },
    {
      id: "wash-sale-tlh",
      context: ["stocks", "realestate", "wait"],
      badge: "Loss Harvesting",
      title: "Tax-Loss Harvesting & The 30-Day Wash-Sale Rule",
      summary: "Offset realized stock/crypto gains dollar-for-dollar before Dec 31, plus deduct up to $3,000/yr against W-2 income and carry forward the rest forever.",
      ctaLabel: "Open TLH & Wash-Sale Guide",
      checklistTitle: "Tax-Loss Harvesting Checklist",
      checklist: [
        "Realize losses before December 31 (settlement date / trade date rules) to offset high-tax Short-Term gains first.",
        "Avoid buying a 'substantially identical' security 30 days before OR 30 days after the sale across ALL accounts (including your IRA).",
        "Swap into a closely correlated but non-identical ETF (e.g., VOO -> ITOT or VTI) to stay invested during the 30-day window.",
        "Unused net capital losses beyond the $3,000 annual ordinary income deduction carry forward indefinitely."
      ],
      url: ""
    },
    {
      id: "sec121-1031-rules",
      context: ["stocks", "realestate", "wait"],
      badge: "Real Estate Tax",
      title: "Section 121 ($250k/$500k) & 1031 Exchange Strict Deadlines",
      summary: "Keep up to $500,000 of primary-home profit tax-free under Section 121, or defer 100% of rental property & depreciation recapture taxes with a 1031 Exchange.",
      ctaLabel: "Open 1031 & Sec 121 Checklist",
      checklistTitle: "Section 121 & 1031 Exchange Checklist",
      checklist: [
        "Section 121 Primary Home Exclusion requires owning AND living in the home for at least 2 of the last 5 years before closing.",
        "Save every receipt for Capital Improvements (new roof, kitchen remodel, HVAC) — they increase your cost basis and cut taxable gain.",
        "For a 1031 Exchange on rental property, hire a Qualified Intermediary (QI) BEFORE closing — you cannot touch the sale proceeds.",
        "Respect the two hard IRS 1031 clocks: identify replacement properties within 45 calendar days and close within 180 calendar days."
      ],
      url: ""
    }
  ]
};
