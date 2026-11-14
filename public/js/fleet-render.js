/* ============================================================
   Bee Cee Logistics — Fleet category data + card/filter rendering
   Three.js is requested only when a fleet card is near the viewport.
   ============================================================ */

(function () {
  "use strict";

  const ICONS = {
    saloon: "directions_car",
    "4x4-pickup": "airport_shuttle",
    "4x4-car": "terrain",
    bus: "directions_bus",
    truck: "local_shipping",
  };
  const DEFAULT_ICON = "directions_car";

  let cachedFleet = null;
  let fetchPromise = null;
  let fleet3dGrid = null;
  let fleet3dCleanup = null;
  let fleet3dLoaderObserver = null;
  let fleet3dRequest = 0;
  let fleet3dModulePromise = null;

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

  function vehicleType(cat) {
    const category = String(cat.category || "").toLowerCase();
    const label = String(cat.label || "").toLowerCase();
    if (category.includes("pickup") || label.includes("pickup")) return "pickup";
    if (category.includes("truck") || label.includes("truck")) return "truck";
    if (category.includes("bus") || label.includes("bus") || label.includes("coach")) return "bus";
    if (category.includes("4x4") || category.includes("suv") || label.includes("suv") || label.includes("4x4")) {
      return "suv";
    }
    return "saloon";
  }

  function vehicleArt(cat) {
    const type = vehicleType(cat);
    const label = escapeHtml(cat.label || "Vehicle");
    const body = type === "bus" || type === "truck"
      ? `<path class="art-body" d="${type === "bus"
        ? "M81 91V53q0-9 10-12l16-4h96q12 0 16 12l8 24v18z"
        : "M67 91V62q0-7 8-10l20-8h38v47z"}"/>`
      : `<path class="art-body" d="${type === "pickup"
        ? "M54 91V73q0-8 9-11l21-4 14-21h48l13 22h45q12 0 17 10l5 22z"
        : type === "suv"
          ? "M54 91V68q0-9 11-12l22-3 15-24h52l17 24 32 5q13 2 17 13v20z"
          : "M53 91V71q0-9 11-13l24-5 17-22h47l20 22 28 5q14 2 18 13v20z"}"/>`;
    let detail = "";
    if (type === "bus") {
      detail = `<path class="art-glass" d="M111 46h82q7 0 10 8l5 17h-97z"/>
        <path class="art-trim" d="M82 78h146v4H82z"/>
        <path class="art-door" d="M204 44v46h-20V44"/>`;
    } else if (type === "truck") {
      detail = `<path class="art-cargo" d="M144 43h70q7 0 9 7l7 39h-86z"/>
        <path class="art-glass" d="M96 51h31v21H81q1-8 6-12z"/>
        <text class="art-lettering" x="179" y="68" text-anchor="middle">BEE CEE</text>`;
    } else if (type === "pickup") {
      detail = `<path class="art-glass" d="M102 42h35l12 18h-59z"/>
        <path class="art-glass" d="M145 43h12l12 18h-19z"/>
        <path class="art-trim" d="M165 65h37v5h-37z"/>`;
    } else {
      detail = `<path class="art-glass" d="M105 46h40l15 18h-68z"/>
        <path class="art-glass" d="M149 46h9l15 18h-9z"/>`;
    }
    const wheels = `<g class="art-wheel">
      <circle cx="92" cy="91" r="15"/><circle class="art-rim" cx="92" cy="91" r="7"/>
      <circle cx="198" cy="91" r="15"/><circle class="art-rim" cx="198" cy="91" r="7"/>
    </g>`;
    return `<svg class="fleet-vehicle-art" viewBox="0 0 280 140" role="img" aria-label="${label}">
      <ellipse class="art-shadow" cx="143" cy="109" rx="94" ry="13"/>
      ${body}${detail}${wheels}
      <path class="art-light" d="M54 77l15-3v8H54z"/><path class="art-tail" d="M229 73l8 3v9h-8z"/>
      <path class="art-highlight" d="M63 69q4-8 13-9l24-4"/>
    </svg>`;
  }

  function disposeFleet3d() {
    fleet3dRequest += 1;
    if (fleet3dLoaderObserver) {
      fleet3dLoaderObserver.disconnect();
      fleet3dLoaderObserver = null;
    }
    if (fleet3dCleanup) {
      fleet3dCleanup();
      fleet3dCleanup = null;
    }
    fleet3dGrid = null;
  }

  function enhanceFleet3d(grid) {
    fleet3dGrid = grid;
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (
      reducedMotion ||
      !(window.WebGLRenderingContext || window.WebGL2RenderingContext) ||
      !("IntersectionObserver" in window) ||
      !grid.querySelector("[data-fleet-vehicle-stage]")
    ) return;

    const request = ++fleet3dRequest;
    fleet3dLoaderObserver = new IntersectionObserver((entries) => {
      if (request !== fleet3dRequest || fleet3dGrid !== grid) return;
      if (!entries.some((entry) => entry.isIntersecting)) return;
      fleet3dLoaderObserver.disconnect();
      fleet3dLoaderObserver = null;
      if (!fleet3dModulePromise) fleet3dModulePromise = import("/js/fleet-3d.js");
      fleet3dModulePromise
        .then((module) => {
          if (request !== fleet3dRequest || fleet3dGrid !== grid) return;
          fleet3dCleanup = module.mountFleet3d(grid);
        })
        .catch((err) => {
          console.warn("Fleet 3D enhancement unavailable; keeping the static vehicle art.", err);
        });
    }, { rootMargin: "120px 0px", threshold: 0 });
    grid.querySelectorAll("[data-fleet-vehicle-stage]").forEach((stage) => fleet3dLoaderObserver.observe(stage));
  }

  if (window.matchMedia) {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      if (motionPreference.matches) {
        if (fleet3dLoaderObserver) fleet3dLoaderObserver.disconnect();
        fleet3dLoaderObserver = null;
        if (fleet3dCleanup) fleet3dCleanup();
        fleet3dCleanup = null;
        fleet3dRequest += 1;
      } else if (fleet3dGrid) {
        enhanceFleet3d(fleet3dGrid);
      }
    };
    if (motionPreference.addEventListener) {
      motionPreference.addEventListener("change", handleMotionChange);
    } else if (motionPreference.addListener) {
      motionPreference.addListener(handleMotionChange);
    }
  }

  function cardTemplate(cat) {
    const icon = ICONS[cat.category] || DEFAULT_ICON;
    const available = !!cat.acceptingBookings;
    const label = typeof cat.label === "string" ? cat.label : "Vehicle";
    const type = vehicleType(cat);

    return `
      <article class="fleet-card bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col" data-category="${escapeHtml(cat.category)}">
        <div class="fleet-vehicle-stage${available ? "" : " is-unavailable"}" data-fleet-vehicle-stage data-vehicle-type="${type}" data-vehicle-label="${escapeHtml(label)}" data-vehicle-available="${available}">
          ${vehicleArt(cat)}
          <span class="fleet-vehicle-stage__caption" aria-hidden="true">${escapeHtml(label)}</span>
          <span class="material-symbols-outlined fleet-vehicle-stage__fallback-icon" aria-hidden="true">${icon}</span>
        </div>
        <div class="p-4 flex flex-col gap-2 flex-grow">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold">${escapeHtml(cat.label)}</h3>
            <div
              class="shrink-0"
              data-category-tag
              data-label="${typeof cat.label === "string" ? escapeHtml(cat.label) : ""}"
              data-category="${typeof cat.category === "string" ? escapeHtml(cat.category) : ""}"
              data-min-rate="${cat.minRate == null ? "" : Number.isFinite(cat.minRate) ? escapeHtml(cat.minRate) : "invalid"}"
              data-max-rate="${cat.maxRate == null ? "" : Number.isFinite(cat.maxRate) ? escapeHtml(cat.maxRate) : "invalid"}"
              data-accepting-bookings="${typeof cat.acceptingBookings === "boolean" ? cat.acceptingBookings : ""}"
              data-created-at="${typeof cat.createdAt === "string" ? escapeHtml(cat.createdAt) : ""}"
              data-updated-at="${typeof cat.updatedAt === "string" ? escapeHtml(cat.updatedAt) : ""}"
            >
              <span class="text-xs font-medium px-2 py-0.5 rounded-full ${available ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"}">
                ${available ? "Available" : "Unavailable"}
              </span>
            </div>
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

      if (window.BeeCeeCategoryTags) {
        window.BeeCeeCategoryTags.unmountCategoryTags(grid);
      }
      disposeFleet3d();

      if (!visible.length) {
        grid.innerHTML = '<p class="col-span-full text-center text-on-surface-variant py-8">No categories found.</p>';
        return;
      }
      grid.innerHTML = visible.map(cardTemplate).join("");
      if (window.BeeCeeCategoryTags) {
        window.BeeCeeCategoryTags.mountCategoryTags(grid);
      }
      enhanceFleet3d(grid);
    } catch (err) {
      if (window.BeeCeeCategoryTags) {
        window.BeeCeeCategoryTags.unmountCategoryTags(grid);
      }
      disposeFleet3d();
      grid.innerHTML = '<p class="col-span-full text-center text-red-600 py-8">Couldn\'t load the fleet right now. Please try again shortly.</p>';
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  }

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
      return;
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

  window.BeeCeeFleet = { fetchFleet, renderFleetInto, renderFleetFilters, vehicleArt };
})();
