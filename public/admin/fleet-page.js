/* ============================================================
   Bee Cee Logistics — Admin Fleet page
   Two independent things on this one page:
   1. Category rate ranges (GET/PUT /api/fleet) — no add/delete,
      fixed set of categories.
   2. Homepage fleet photo gallery (GET/POST/DELETE /api/fleet-images)
      — plain photos, no category or price attached, shown on the
      homepage only.
   ============================================================ */

(function () {
  "use strict";

  /* ------------------------------------------------------------
     Section 1 — Fleet Categories
     ------------------------------------------------------------ */
  const listEl = document.getElementById("categoryList");
  const loadError = document.getElementById("loadError");

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function cardTemplate(cat) {
    return `
      <div class="category-card border border-gray-200 rounded-lg p-4" data-category="${escapeHtml(cat.category)}">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-[#3B4A1E]">${escapeHtml(cat.label)}</h3>
          <label class="toggle-pill text-sm text-gray-600">
            <input type="checkbox" class="accepting-input" ${cat.acceptingBookings ? "checked" : ""}/>
            Accepting bookings
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Min Rate (ZMW/day)</label>
            <input type="number" min="0" class="min-rate-input w-full border border-gray-300 rounded px-3 py-2" value="${cat.minRate}"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Max Rate (ZMW/day)</label>
            <input type="number" min="0" class="max-rate-input w-full border border-gray-300 rounded px-3 py-2" value="${cat.maxRate}"/>
          </div>
        </div>

        <p class="field-hint error-hint text-red-600 hidden"></p>

        <div class="flex items-center gap-3 mt-3">
          <button type="button" class="save-btn bg-[#3B4A1E] text-white text-sm font-semibold rounded px-4 py-1.5 hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed">
            Save
          </button>
          <span class="save-status text-xs text-gray-500"></span>
        </div>
      </div>
    `;
  }

  function wireCategoryCard(card, cat) {
    const minInput = card.querySelector(".min-rate-input");
    const maxInput = card.querySelector(".max-rate-input");
    const acceptingInput = card.querySelector(".accepting-input");
    const saveBtn = card.querySelector(".save-btn");
    const saveStatus = card.querySelector(".save-status");
    const errorHint = card.querySelector(".error-hint");

    function markDirty() {
      card.classList.add("is-dirty");
      saveStatus.textContent = "";
    }
    [minInput, maxInput, acceptingInput].forEach((el) => el.addEventListener("input", markDirty));
    acceptingInput.addEventListener("change", markDirty);

    saveBtn.addEventListener("click", async () => {
      errorHint.classList.add("hidden");

      const minRate = Number(minInput.value);
      const maxRate = Number(maxInput.value);

      if (!Number.isFinite(minRate) || !Number.isFinite(maxRate) || minRate < 0 || maxRate < 0) {
        errorHint.textContent = "Enter a valid minimum and maximum daily rate.";
        errorHint.classList.remove("hidden");
        return;
      }
      if (maxRate < minRate) {
        errorHint.textContent = "Maximum rate can't be lower than the minimum rate.";
        errorHint.classList.remove("hidden");
        return;
      }

      saveBtn.disabled = true;
      saveStatus.textContent = "Saving…";

      try {
        const res = await fetch(`/api/fleet/${encodeURIComponent(cat.category)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            minRate,
            maxRate,
            acceptingBookings: acceptingInput.checked,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong.");

        card.classList.remove("is-dirty");
        saveStatus.textContent = "Saved.";
        setTimeout(() => { saveStatus.textContent = ""; }, 2000);
      } catch (err) {
        errorHint.textContent = err.message;
        errorHint.classList.remove("hidden");
        saveStatus.textContent = "";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  async function loadCategories() {
    loadError.classList.add("hidden");
    listEl.innerHTML = `<p class="text-gray-500 text-sm py-4">Loading…</p>`;

    try {
      const res = await fetch("/api/fleet");
      if (!res.ok) throw new Error("Could not load fleet categories.");
      const categories = await res.json();

      if (!categories.length) {
        listEl.innerHTML = `<p class="text-gray-500 text-sm py-4">No categories found.</p>`;
        return;
      }

      listEl.innerHTML = categories.map(cardTemplate).join("");
      listEl.querySelectorAll(".category-card").forEach((card) => {
        const category = card.dataset.category;
        const cat = categories.find((c) => c.category === category);
        wireCategoryCard(card, cat);
      });
    } catch (err) {
      listEl.innerHTML = "";
      loadError.textContent = err.message;
      loadError.classList.remove("hidden");
    }
  }

  /* ------------------------------------------------------------
     Section 2 — Homepage Fleet Photo Gallery
     ------------------------------------------------------------ */
  const galleryImagesInput = document.getElementById("galleryImagesInput");
  const galleryNewPreviews = document.getElementById("galleryNewPreviews");
  const galleryUploadBtn = document.getElementById("galleryUploadBtn");
  const galleryUploadError = document.getElementById("galleryUploadError");
  const galleryCurrentPhotos = document.getElementById("galleryCurrentPhotos");

  let selectedGalleryFiles = [];
  let selectedGalleryPreviewUrls = [];

  function revokeGalleryPreviewUrls() {
    selectedGalleryPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    selectedGalleryPreviewUrls = [];
  }

  function renderGalleryPreviews() {
    revokeGalleryPreviewUrls();

    if (!selectedGalleryFiles.length) {
      galleryNewPreviews.innerHTML = "";
      return;
    }

    galleryNewPreviews.innerHTML = selectedGalleryFiles.map((file, i) => {
      const url = URL.createObjectURL(file);
      selectedGalleryPreviewUrls.push(url);
      return `
        <div class="preview-tile">
          <img class="thumb-lg" src="${url}" alt="${escapeHtml(file.name)}"/>
          <button type="button" data-remove-new="${i}" class="preview-remove" aria-label="Remove this photo">×</button>
        </div>
      `;
    }).join("");

    galleryNewPreviews.querySelectorAll("[data-remove-new]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedGalleryFiles.splice(Number(btn.dataset.removeNew), 1);
        renderGalleryPreviews();
      });
    });
  }

  galleryImagesInput.addEventListener("change", () => {
    const incoming = Array.from(galleryImagesInput.files);
    incoming.forEach((file) => {
      const alreadyAdded = selectedGalleryFiles.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      if (!alreadyAdded) selectedGalleryFiles.push(file);
    });
    galleryImagesInput.value = ""; // reset so picking again fires "change"
    renderGalleryPreviews();
  });

  function galleryPhotoTemplate(img) {
    return `
      <div class="preview-tile" data-photo-id="${escapeHtml(img._id)}">
        <img class="thumb-lg" src="${escapeHtml(img.imageUrl)}" alt=""/>
        <button type="button" data-delete-photo="${escapeHtml(img._id)}" class="preview-remove" aria-label="Delete this photo">×</button>
      </div>
    `;
  }

  async function loadGalleryPhotos() {
    galleryCurrentPhotos.innerHTML = `<p class="text-gray-500 text-sm">Loading…</p>`;
    try {
      const res = await fetch("/api/fleet-images");
      if (!res.ok) throw new Error("Could not load photos.");
      const images = await res.json();

      if (!images.length) {
        galleryCurrentPhotos.innerHTML = `<p class="text-gray-500 text-sm">No photos uploaded yet.</p>`;
        return;
      }

      galleryCurrentPhotos.innerHTML = images.map(galleryPhotoTemplate).join("");
      galleryCurrentPhotos.querySelectorAll("[data-delete-photo]").forEach((btn) => {
        btn.addEventListener("click", () => deleteGalleryPhoto(btn.dataset.deletePhoto));
      });
    } catch (err) {
      galleryCurrentPhotos.innerHTML = `<p class="text-sm text-red-600">${escapeHtml(err.message)}</p>`;
    }
  }

  async function deleteGalleryPhoto(id) {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/fleet-images/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete photo.");
      }
      loadGalleryPhotos();
    } catch (err) {
      alert(err.message);
    }
  }

  galleryUploadBtn.addEventListener("click", async () => {
    galleryUploadError.classList.add("hidden");

    if (!selectedGalleryFiles.length) {
      galleryUploadError.textContent = "Choose at least one photo first.";
      galleryUploadError.classList.remove("hidden");
      return;
    }

    const fd = new FormData();
    selectedGalleryFiles.forEach((file) => fd.append("images", file));

    galleryUploadBtn.disabled = true;
    const originalLabel = galleryUploadBtn.textContent;
    galleryUploadBtn.textContent = "Uploading…";

    try {
      const res = await fetch("/api/fleet-images", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      selectedGalleryFiles = [];
      renderGalleryPreviews();
      loadGalleryPhotos();
    } catch (err) {
      galleryUploadError.textContent = err.message;
      galleryUploadError.classList.remove("hidden");
    } finally {
      galleryUploadBtn.disabled = false;
      galleryUploadBtn.textContent = originalLabel;
    }
  });

  /* ------------------------------------------------------------ */
  loadCategories();
  loadGalleryPhotos();
})();