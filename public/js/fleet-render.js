/* ============================================================
   Bee Cee Logistics — Fleet category data + card rendering
   Exposes window.BeeCeeFleet so any page can:
     - fetchFleet(): get the (cached) list of the 5 fixed categories
       with their rate ranges, from GET /api/fleet.
     - renderFleetInto(selector, opts): render category rate cards
       into a container. No filters — there are only 5 fixed
       categories, so all of them always show. opts.limit caps how
       many cards render, if ever needed; omit it to show all.
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

    return `
      <article class="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col" data-category="${escapeHtml(cat.category)}">
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

  window.BeeCeeFleet = { fetchFleet, renderFleetInto };
})();