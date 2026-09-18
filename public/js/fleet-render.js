/* ============================================================
   Bee Cee Logistics — Fleet category data + card/filter rendering
   Exposes window.BeeCeeFleet so any page can:
     - fetchFleet(): get the (cached) list of the 5 fixed categories
       with their rate ranges, from GET /api/fleet.
     - renderFleetInto(selector, opts): render category rate cards
       into a container. opts.limit caps how many cards render, if
       ever needed; omit it to show all.
     - renderFleetFilters(selector, opts): render the "All" + one
       pill per category filter bar from the same live data, and
       wire clicks to filter the rendered cards. opts.gridSelector
       tells it which grid to filter (defaults to [data-fleet-grid]).
   Used by fleet.html (via cee.js's loadFleet()) and by
   request.html's category-booking form (via fetchFleet() directly).
   Load this before cee.js on any page that needs it.
   ============================================================ */

(function () {
  "use strict";

  const ICONS = {
    saloon: "directions_car",
    "4x4": "terrain",
    bus: "directions_bus",
    truck: "local_shipping",
  };
  const DEFAULT_ICON = "directions_car";

  let cachedFleet = null;
  let fetchPromise = null;

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatRate(cat) {
    const noRealRange = !cat.minRate && !cat.maxRate;
    if (!cat.acceptingBookings || noRealRange) return "Contact us for a rate";
    if (cat.minRate === cat.maxRate) return `K${cat.minRate.toLocaleString()} / day`;
    return `K${cat.minRate.toLocaleString()} – K${cat.maxRate.toLocaleString()} / day`;
  }

  // Cached + de-duped so fleet.html and request.html can both call this
  // freely without firing off duplicate requests.
  function fetchFleet() {
    if (cachedFleet) return Promise.resolve(cachedFleet);
    if (!fetchPromise) {
      fetchPromise = fetch("/api/fleet")
        .then((res) => {
          if (!res.ok) throw new Error("Could not load fleet categories.");
          return res.json();
        })
        .then((data) => {
          cachedFleet = data;
          return data;
        })
        .finally(() => {
          fetchPromise = null;
        });
    }
    return fetchPromise;
  }

  function cardTemplate(cat) {
    const icon = ICONS[cat.category] || DEFAULT_ICON;
    const available = !!cat.acceptingBookings;

    // "fleet-card" class added so the filter bar below (and the existing
    // .fleet-card[hidden] rule in bee.css) has something to select.
    return `
      <article class="fleet-card bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col" data-category="${escapeHtml(cat.category)}">
        <div class="fleet-skeleton-media flex items-center justify-center" style="min-height:160px;">
          <span class="material-symbols-outlined text-primary" style="font-size:56px;" aria-hidden="true">${icon}</span>
        </div>
        <div class="p-4 flex flex-col gap-2 flex-grow">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold">${escapeHtml(cat.label)}</h3>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full ${available ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"}">
              ${available ? "Available" : "Unavailable"}
            </span>
          </div>
          <p class="font-body-md text-body-md text-on-surface-variant">${formatRate(cat)}</p>
          <div class="mt-auto pt-3">
            ${
              available
                ? `<a href="request.html?category=${encodeURIComponent(cat.category)}" class="btn btn-primary btn-block">Request a Quote</a>`
                : `<span class="btn btn-block opacity-50 pointer-events-none border border-outline-variant text-on-surface-variant">Currently Unavailable</span>`
            }
          </div>
        </div>
      </article>
    `;
  }

  async function renderFleetInto(selector, opts) {
    opts = opts || {};
    const grid = document.querySelector(selector);
    if (!grid) return;

    grid.setAttribute("aria-busy", "true");
    try {
      const categories = await fetchFleet();
      const visible = opts.limit ? categories.slice(0, opts.limit) : categories;

      if (!visible.length) {
        grid.innerHTML = '<p class="col-span-full text-center text-on-surface-variant py-8">No categories found.</p>';
        return;
      }
      grid.innerHTML = visible.map(cardTemplate).join("");
    } catch (err) {
      grid.innerHTML = '<p class="col-span-full text-center text-red-600 py-8">Couldn\'t load the fleet right now. Please try again shortly.</p>';
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  }

  /* ------------------------------------------------------------------------
     Filter pill bar — one "All" pill plus one pill per live category,
     built from the same /api/fleet data as the cards. Clicking a pill
     toggles which .fleet-card elements are visible in the target grid by
     comparing each card's data-category to the pill's data-filter.
     No-ops quietly (leaves whatever static markup was already there, e.g.
     just the "All" button) if the fetch fails, so a network hiccup never
     leaves the filter bar empty.
     ------------------------------------------------------------------------ */
  function filterButtonTemplate(cat) {
    const icon = ICONS[cat.category] || DEFAULT_ICON;
    return `
      <button type="button" class="fleet-filter" data-filter="${escapeHtml(cat.category)}" aria-pressed="false">
        <span class="material-symbols-outlined" aria-hidden="true">${icon}</span>
        ${escapeHtml(cat.label)}
      </button>
    `;
  }

  function applyFilter(gridSelector, filter) {
    const grid = document.querySelector(gridSelector);
    if (!grid) return;
    grid.querySelectorAll(".fleet-card").forEach((card) => {
      const matches = filter === "all" || card.getAttribute("data-category") === filter;
      card.hidden = !matches;
    });
  }

  async function renderFleetFilters(selector, opts) {
    opts = opts || {};
    const container = document.querySelector(selector);
    if (!container) return;
    const gridSelector = opts.gridSelector || "[data-fleet-grid]";

    let categories = [];
    try {
      categories = await fetchFleet();
    } catch (err) {
      return; // keep whatever static "All" button is already in the markup
    }

    const allButtonTemplate = `
      <button type="button" class="fleet-filter" data-filter="all" aria-pressed="true">
        <span class="material-symbols-outlined" aria-hidden="true">apps</span>
        All
      </button>
    `;

    container.innerHTML = allButtonTemplate + categories.map(filterButtonTemplate).join("");

    container.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll("[data-filter]").forEach((b) => {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        applyFilter(gridSelector, btn.getAttribute("data-filter"));
      });
    });
  }

  window.BeeCeeFleet = { fetchFleet, renderFleetInto, renderFleetFilters };
})();