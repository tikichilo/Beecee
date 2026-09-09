/* ============================================================
   Bee Cee Logistics — Homepage Fleet Photo Gallery
   Plain photos only — no categories, no pricing, no per-vehicle
   metadata. Managed from the admin Fleet page's gallery uploader
   (POST/DELETE /api/fleet-images); this just displays them.
   ============================================================ */

(function () {
  "use strict";

  const grid = document.querySelector("[data-fleet-grid]");
  if (!grid) return;

  function skeletonCard() {
    return `
      <div class="fleet-skeleton-card" aria-hidden="true">
        <div class="fleet-skeleton-media"></div>
      </div>
    `;
  }

  function photoCard(img) {
    return `
      <div class="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low aspect-square">
        <img src="${img.imageUrl}" alt="Bee Cee Logistics fleet vehicle" loading="lazy" class="w-full h-full object-cover"/>
      </div>
    `;
  }

  async function init() {
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = Array.from({ length: 4 }).map(skeletonCard).join("");

    try {
      const res = await fetch("/api/fleet-images");
      if (!res.ok) throw new Error("Could not load fleet photos.");
      const images = await res.json();

      if (!images.length) {
        grid.innerHTML = `<p class="col-span-full text-center text-on-surface-variant py-8">Fleet photos coming soon.</p>`;
        return;
      }

      // Cap the homepage preview so it doesn't overwhelm the section —
      // the full set (if there ever is more) still lives at /api/fleet-images.
      grid.innerHTML = images.slice(0, 8).map(photoCard).join("");
    } catch (err) {
      grid.innerHTML = "";
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  }

  init();
})();