/**
 * Dynamic Result-Driven CTA Engine (R&D Upgrade — 2026 CRO Standard)
 * Automatically personalizes inline Gumroad CTAs with the exact live numbers calculated by the user.
 */
(function () {
  "use strict";
  const RULES = [{"slot": "stocks", "id": "stNetProceeds", "tpl": "Track {val} net proceeds, 366-day lots & TLH", "sub": "Free $0 Lite available · Zero monthly subscriptions — Portfolio & Net Worth Google Sheet.", "btn": "Get Wealth OS ($0 / $19) &rarr;", "url": "https://897833387907.gumroad.com/l/us-personal-finance-wealth-os-2026"}, {"slot": "realestate", "id": "reNetCash", "tpl": "Track {val} sale equity, Schedule E & 1031 deals", "sub": "Free $0 Lite available · Zero monthly subscriptions — Rental Property & BRRRR Google Sheet.", "btn": "Get Rental OS ($0 / $24) &rarr;", "url": "https://897833387907.gumroad.com/l/us-rental-property-schedule-e-brrrr-os-2026"}, {"slot": "wait", "id": "wtBreakevenDrop", "tpl": "Use your {val} cushion & log 366-day lots", "sub": "Save $14 · Combine FULL Wealth OS ($19) + FULL 1099 Tax OS ($24) for $29.", "btn": "Get Bundle ($29 · Save $14) &rarr;", "url": "https://897833387907.gumroad.com/l/us-money-1099-tax-bundle-2026"}];

  function syncRule(rule) {
    const src = document.getElementById(rule.id);
    const box = document.querySelector('[data-result-cta="' + rule.slot + '"]');
    if (!src || !box) return;
    const raw = (src.textContent || "").trim();
    if (!raw) return;
    const headline = rule.tpl.replace("{val}", raw);
    if (box.dataset.lastDynamicHeadline === headline) return;
    box.dataset.lastDynamicHeadline = headline;
    box.innerHTML =
      '<div class="result-cta-copy">' +
        '<strong>' + headline + '</strong>' +
        '<span style="display:block;font-size:0.8rem;color:var(--text-secondary);margin-top:0.15rem;">' + rule.sub + '</span>' +
      '</div>' +
      '<div class="result-cta-action" style="flex-shrink:0;">' +
        '<a class="btn btn-primary btn-sm" href="' + rule.url + '" target="_blank" rel="noopener noreferrer">' + rule.btn + '</a>' +
      '</div>';
  }

  function syncAll() {
    RULES.forEach(syncRule);
  }

  function boot() {
    syncAll();
    const obs = new MutationObserver(syncAll);
    RULES.forEach(function (r) {
      const el = document.getElementById(r.id);
      if (el) obs.observe(el, { childList: true, characterData: true, subtree: true });
    });
    document.addEventListener("input", function () { setTimeout(syncAll, 20); });
    document.addEventListener("change", function () { setTimeout(syncAll, 20); });
    document.addEventListener("click", function () { setTimeout(syncAll, 40); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 50); });
  } else {
    setTimeout(boot, 50);
  }
})();
