/* ==========================================================================
   Bee Cee Logistics — cee.js
   Shared page logic: form validation & submission, fleet category
   rendering, homepage fleet photo gallery + lightbox, request.html mode
   switching (quote / vehicle booking / removals), toast notifications.
   Every function checks for its markup before doing anything, so this one
   file is safe to include on every public page — it simply no-ops on
   pages that don't have a given piece of markup. Cross-page UI reactivity
   (nav, mobile menu) lives in bee.js.
   ========================================================================== */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    loadFleet();
    loadFleetPhotos();
    setupRequestModes();
    setupFormValidation("[data-contact-form]", contactFormFields);
    setupFormValidation("[data-quote-form]", quoteFormFields);
  }

  /* ------------------------------------------------------------------------
     Fleet category cards (fleet.html full grid) — cards come from
     /api/fleet, not markup. No-ops on any page without [data-fleet-grid]
     or without fleet-render.js loaded (window.BeeCeeFleet undefined). No
     category filters — there are only 5 fixed categories now, so all of
     them show at once.
     ------------------------------------------------------------------------ */
  function loadFleet() {
    if (!window.BeeCeeFleet) return;
    const grid = document.querySelector("[data-fleet-grid]");
    if (!grid) return;
    const limit = grid.getAttribute("data-fleet-limit");
    window.BeeCeeFleet.renderFleetInto("[data-fleet-grid]", limit ? { limit: Number(limit) } : {});
  }

  /* ------------------------------------------------------------------------
     Homepage fleet photo gallery — plain photos, no categories or pricing
     attached. Managed from the admin Fleet page's gallery uploader and
     served from GET /api/fleet-images. Shows every photo (no cap, no
     "view more" link, since there's nowhere else the rest would live) and
     opens a full-size lightbox on click. No-ops on any page without
     [data-fleet-photo-grid].
     ------------------------------------------------------------------------ */
  function loadFleetPhotos() {
    const grid = document.querySelector("[data-fleet-photo-grid]");
    if (!grid) return;

    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = Array.from({ length: 4 })
      .map(() => '<div class="fleet-skeleton-card" aria-hidden="true"><div class="fleet-skeleton-media"></div></div>')
      .join("");

    fetch("/api/fleet-images")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load fleet photos.");
        return res.json();
      })
      .then((images) => {
        if (!images.length) {
          grid.innerHTML = '<p class="col-span-full text-center text-on-surface-variant py-8">Fleet photos coming soon.</p>';
          return;
        }

        // Show every photo in the fleet database — no cap.
        grid.innerHTML = images
          .map(
            (img) => `
              <button type="button" class="fleet-photo-thumb rounded-xl overflow-hidden border-4 border-primary bg-surface-container-low aspect-square block w-full p-0" data-photo-url="${img.imageUrl}">
                <img src="${img.imageUrl}" alt="Bee Cee Logistics fleet vehicle" loading="lazy" class="w-full h-full object-cover"/>
              </button>
            `
          )
          .join("");

        grid.querySelectorAll("[data-photo-url]").forEach((btn) => {
          btn.addEventListener("click", () => openLightbox(btn.getAttribute("data-photo-url")));
        });
      })
      .catch(() => {
        grid.innerHTML = "";
      })
      .finally(() => {
        grid.setAttribute("aria-busy", "false");
      });
  }

  /* ------------------------------------------------------------------------
     Full-size photo lightbox, shared by the fleet photo gallery. Built
     once and reused, same lazy-create pattern as the toast helper below.
     ------------------------------------------------------------------------ */
  function openLightbox(imageUrl) {
    let overlay = document.querySelector(".lightbox-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "lightbox-overlay fixed inset-0 z-[100] hidden items-center justify-center bg-black/80 p-6";
      overlay.innerHTML =
        '<button type="button" class="lightbox-close absolute top-4 right-4 text-white p-2" aria-label="Close">' +
        '<span class="material-symbols-outlined" aria-hidden="true" style="font-size:32px;">close</span>' +
        "</button>" +
        '<img class="lightbox-image max-w-full max-h-full rounded-lg" alt="Fleet vehicle, full size"/>';
      document.body.appendChild(overlay);

      const close = () => {
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
      };
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      overlay.querySelector(".lightbox-close").addEventListener("click", close);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !overlay.classList.contains("hidden")) close();
      });
    }

    overlay.querySelector(".lightbox-image").src = imageUrl;
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
  }

  /* ------------------------------------------------------------------------
     Toast helper (shared by every form on the site)
     ------------------------------------------------------------------------ */
  function showToast(message, variant) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span>' +
        '<span class="toast__message"></span>';
      document.body.appendChild(toast);
    }
    toast.classList.toggle("toast--error", variant === "error");
    toast.querySelector(".toast__message").textContent = message;
    toast.classList.add("toast--visible");
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      toast.classList.remove("toast--visible");
    }, 4000);
  }

  /* ------------------------------------------------------------------------
     request.html mode switching — quote form (default), vehicle-category
     booking form (?category=<key>), or removals request form
     (?service=removals). No-ops on pages without [data-quote-mode].
     ------------------------------------------------------------------------ */
  function setupRequestModes() {
    const quoteMode = document.querySelector("[data-quote-mode]");
    const bookingMode = document.querySelector("[data-booking-mode]");
    const removalsMode = document.querySelector("[data-removals-mode]");
    if (!quoteMode && !bookingMode && !removalsMode) return;

    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    const service = params.get("service");

    function showOnly(mode) {
      [quoteMode, bookingMode, removalsMode].forEach((el) => {
        if (el) el.hidden = el !== mode;
      });
    }

    if (category && bookingMode) {
      showOnly(bookingMode);
      setupBookingMode(category);
    } else if (service === "removals" && removalsMode) {
      showOnly(removalsMode);
      setupFormValidation("[data-removals-form]", removalsFormFields);
    } else {
      showOnly(quoteMode);
    }
  }

  /* ------------------------------------------------------------------------
     Vehicle-category booking form (request.html?category=<key>). Loads the
     5 categories, pre-selects the one from the URL, keeps the proposed-rate
     field's min/max in sync with the selected category's posted range, and
     submits straight to /api/bookings as multipart form data.
     ------------------------------------------------------------------------ */
  async function setupBookingMode(initialCategory) {
    const form = document.querySelector("[data-booking-form]");
    if (!form || !window.BeeCeeFleet) return;

    const categorySelect = form.querySelector("#bookingCategory");
    const proposedRateInput = form.querySelector("#proposedRate");
    const labelEl = document.querySelector("[data-booking-category-label]");
    const rangeEl = document.querySelector("[data-booking-category-range]");
    const selfDriveFields = form.querySelector("[data-self-drive-fields]");
    if (!categorySelect || !proposedRateInput) return;

    let categories = [];
    try {
      categories = await window.BeeCeeFleet.fetchFleet();
    } catch (err) {
      showToast("Could not load vehicle categories — please refresh and try again.", "error");
      return;
    }

    function fmtK(n) {
      return "K" + Number(n).toLocaleString();
    }

    categorySelect.innerHTML = categories
      .map((c) => `<option value="${c.category}">${c.label} (${fmtK(c.minRate)}–${fmtK(c.maxRate)}/day)</option>`)
      .join("");

    function applySelection() {
      const cat = categories.find((c) => c.category === categorySelect.value) || categories[0];
      if (!cat) return;
      if (labelEl) labelEl.textContent = cat.label;
      if (rangeEl) rangeEl.textContent = `${fmtK(cat.minRate)} – ${fmtK(cat.maxRate)} / day`;
      proposedRateInput.min = cat.minRate;
      proposedRateInput.max = cat.maxRate;
      proposedRateInput.placeholder = `Between ${fmtK(cat.minRate)} and ${fmtK(cat.maxRate)}`;
    }

    if (initialCategory && categories.some((c) => c.category === initialCategory)) {
      categorySelect.value = initialCategory;
    }
    applySelection();
    categorySelect.addEventListener("change", applySelection);

    function updateDriverFields() {
      const checked = form.querySelector('input[name="driverOption"]:checked');
      if (selfDriveFields) selfDriveFields.classList.toggle("hidden", !checked || checked.value !== "self");
    }
    form.querySelectorAll('input[name="driverOption"]').forEach((radio) => {
      radio.addEventListener("change", updateDriverFields);
    });
    updateDriverFields();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting…";
      }

      try {
        const formData = new FormData(form);
        const res = await fetch("/api/bookings", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong.");

        showToast("Thanks — your booking request has been received. We'll confirm shortly.");
        form.reset();
        applySelection();
        updateDriverFields();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     Form validation & mock submission (contact + generic quote form)
     ------------------------------------------------------------------------ */
  const contactFormFields = {
    firstName: { required: true, label: "First name" },
    lastName: { required: true, label: "Last name" },
    email: { required: true, label: "Email address", type: "email" },
    message: { required: true, label: "Message" }
  };

  const quoteFormFields = {
    fullName: { required: true, label: "Full name" },
    email: { required: true, label: "Email address", type: "email" },
    phone: { required: true, label: "Phone number" },
    serviceType: { required: true, label: "Service type" }
  };

  const removalsFormFields = {
    fullName: { required: true, label: "Full name" },
    email: { required: true, label: "Email address", type: "email" },
    phone: { required: true, label: "Phone number" },
    moveFrom: { required: true, label: "Moving from" },
    moveTo: { required: true, label: "Moving to" },
    moveDate: { required: true, label: "Preferred moving date" }
  };

  function setupFormValidation(selector, fieldMap) {
    const form = document.querySelector(selector);
    if (!form) return;

    form.setAttribute("novalidate", "");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errors = validate(form, fieldMap);
      if (errors.length) {
        showToast(
          "Please fix " + errors.length + " field" + (errors.length > 1 ? "s" : "") + " before submitting.",
          "error"
        );
        return;
      }
      const submitBtn = form.querySelector('[type="submit"], [data-submit]');
      const originalLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }
      // Placeholder for a real backend call — swap this for a fetch() to
      // your quote/contact API endpoint when one is available.
      window.setTimeout(() => {
        showToast("Thanks — we've received your message and will be in touch shortly.");
        form.reset();
        clearFieldErrors(form, fieldMap);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      }, 600);
    });

    // Clear a field's error state as soon as the person fixes it.
    Object.keys(fieldMap).forEach((name) => {
      const field = form.elements.namedItem(name);
      if (!field) return;
      field.addEventListener("input", () => setFieldError(field, false));
      field.addEventListener("change", () => setFieldError(field, false));
    });
  }

  function validate(form, fieldMap) {
    const errors = [];
    Object.entries(fieldMap).forEach(([name, rules]) => {
      const field = form.elements.namedItem(name);
      if (!field) return;
      const value = (field.value || "").trim();
      let invalid = false;

      if (rules.required && !value) invalid = true;
      if (!invalid && rules.type === "email" && value && !isValidEmail(value)) invalid = true;

      setFieldError(field, invalid, invalid && rules.type === "email" && value ? "Enter a valid email address." : `${rules.label} is required.`);
      if (invalid) errors.push(name);
    });
    return errors;
  }

  function setFieldError(field, isInvalid, message) {
    field.setAttribute("data-invalid", String(isInvalid));
    let helper = field.parentElement.querySelector(".form-error-text");
    if (isInvalid) {
      if (!helper) {
        helper = document.createElement("p");
        helper.className = "form-error-text";
        field.parentElement.appendChild(helper);
      }
      helper.textContent = message || "This field is required.";
    } else if (helper) {
      helper.remove();
    }
  }

  function clearFieldErrors(form, fieldMap) {
    Object.keys(fieldMap).forEach((name) => {
      const field = form.elements.namedItem(name);
      if (field) setFieldError(field, false);
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
})();