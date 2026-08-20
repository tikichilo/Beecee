/* ==========================================================================
   Bee Cee Logistics — fleet-render.js
   Fetches live fleet data from /api/fleet and renders it as cards, on both
   the homepage preview and the full fleet.html grid. Keep this file in sync
   with the card markup in bee.css if the design changes.
   ========================================================================== */
(function () {
  "use strict";

  const STATUS_LABEL = { available: "Available", booked: "Booked", maintenance: "Maintenance" };
  const STATUS_CLASS = {
    available: "bg-success text-white",
    booked: "bg-error text-on-error",
    maintenance: "bg-secondary-container text-on-secondary-container",
  };
  const CATEGORY_LABEL = { saloon: "Saloon Car", "4x4": "4x4 & SUV", bus: "Bus", truck: "Truck" };

  function formatFee(fee) {
    if (fee === undefined || fee === null || fee === "") return "";
    return "K" + Number(fee).toLocaleString() + " / day";
  }

  function cardHTML(vehicle, { compact = false } = {}) {
    const images = vehicle.images && vehicle.images.length ? vehicle.images : ["/images/fleet-placeholder.jpg"];
    const statusKey = vehicle.status || "available";
    const canBook = statusKey === "available";

    const detailRows = compact
      ? ""
      : `
      <dl class="grid grid-cols-2 gap-x-3 gap-y-1 font-data-mono text-data-mono text-on-surface-variant mb-4">
        <dt class="opacity-70">Seats</dt><dd>${vehicle.seatingCapacity ?? "—"}</dd>
        ${vehicle.loadLimitKg ? `<dt class="opacity-70">Load limit</dt><dd>${vehicle.loadLimitKg} kg</dd>` : ""}
        <dt class="opacity-70">Location</dt><dd>${vehicle.location ?? "—"}</dd>
        <dt class="opacity-70">Booking fee</dt><dd>${formatFee(vehicle.bookingFee)}</dd>
      </dl>`;

    return `
    <article class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-sm" data-fleet-card data-category="${vehicle.category}" data-vehicle-id="${vehicle._id}">
      <div class="h-48 relative fleet-card__media" data-image-index="0">
        ${images.map((src, i) => `<img class="w-full h-full object-cover fleet-card__img${i === 0 ? " is-active" : ""}" alt="${vehicle.name}" src="${src}" style="${i === 0 ? "" : "display:none"}"/>`).join("")}
        ${images.length > 1 ? `
          <button type="button" class="fleet-card__nav fleet-card__nav--prev" aria-label="Previous photo">&#10094;</button>
          <button type="button" class="fleet-card__nav fleet-card__nav--next" aria-label="Next photo">&#10095;</button>
          <span class="fleet-card__count">1 / ${images.length}</span>
        ` : ""}
        <span class="absolute top-2 right-2 ${STATUS_CLASS[statusKey]} font-label-sm text-label-sm px-2 py-1 rounded shadow-sm">${STATUS_LABEL[statusKey]}</span>
      </div>
      <div class="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 class="font-headline-md text-headline-md text-primary mb-1">${vehicle.name}</h3>
          <p class="font-body-md text-body-md text-on-surface-variant mb-2">${CATEGORY_LABEL[vehicle.category] || vehicle.category}</p>
          ${detailRows}
        </div>
        ${canBook
          ? `<a class="btn btn-primary btn-block btn-sm" href="request.html?vehicle=${vehicle._id}">Book Now</a>`
          : `<button class="btn btn-outline btn-block btn-sm" disabled aria-disabled="true">Currently ${STATUS_LABEL[statusKey]}</button>`
        }
      </div>
    </article>`;
  }

  function wireImageCyclers(root) {
    root.querySelectorAll("[data-fleet-card]").forEach((card) => {
      const media = card.querySelector(".fleet-card__media");
      if (!media) return;
      const imgs = Array.from(media.querySelectorAll(".fleet-card__img"));
      const counter = media.querySelector(".fleet-card__count");
      let index = 0;

      function show(i) {
        imgs[index].style.display = "none";
        imgs[index].classList.remove("is-active");
        index = (i + imgs.length) % imgs.length;
        imgs[index].style.display = "";
        imgs[index].classList.add("is-active");
        if (counter) counter.textContent = `${index + 1} / ${imgs.length}`;
      }

      const prev = media.querySelector(".fleet-card__nav--prev");
      const next = media.querySelector(".fleet-card__nav--next");
      if (prev) prev.addEventListener("click", (e) => { e.preventDefault(); show(index - 1); });
      if (next) next.addEventListener("click", (e) => { e.preventDefault(); show(index + 1); });
    });
  }

  async function fetchFleet(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch("/api/fleet" + (qs ? `?${qs}` : ""));
    if (!res.ok) throw new Error("Could not load fleet data.");
    return res.json();
  }

  /**
   * Renders into any container with [data-fleet-grid]. Pass compact:true for
   * the homepage preview (name + category only, no spec table).
   */
  async function renderFleetInto(selector, { compact = false, category = "all", limit } = {}) {
    const container = document.querySelector(selector);
    if (!container) return;

    container.innerHTML = `<p class="col-span-full text-center font-body-md text-body-md text-on-surface-variant py-8">Loading fleet…</p>`;

    try {
      let vehicles = await fetchFleet(category !== "all" ? { category } : {});
      if (limit) vehicles = vehicles.slice(0, limit);

      if (!vehicles.length) {
        container.innerHTML = `<p class="col-span-full text-center font-body-md text-body-md text-on-surface-variant py-8">No vehicles listed yet — check back soon.</p>`;
        return;
      }

      container.innerHTML = vehicles.map((v) => cardHTML(v, { compact })).join("");
      wireImageCyclers(container);
    } catch (err) {
      container.innerHTML = `<p class="col-span-full text-center font-body-md text-body-md text-error py-8">${err.message}</p>`;
    }
  }

  window.BeeCeeFleet = { renderFleetInto, fetchFleet };
})();
