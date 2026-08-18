/* ==========================================================================
   Bee Cee Logistics — cee.js
   Page-specific functionality: form validation & submission, fleet
   filtering, toast notifications. Cross-page UI reactivity (nav, mobile
   menu) lives in bee.js.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setupFleetFilters();
    setupFormValidation("[data-contact-form]", contactFormFields);
    setupFormValidation("[data-quote-form]", quoteFormFields);
  }

  /* ------------------------------------------------------------------------
     Toast helper (shared by both forms)
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
     Fleet filters (fleet.html)
     ------------------------------------------------------------------------ */
  function setupFleetFilters() {
    const filterBar = document.querySelector("[data-fleet-filters]");
    const cards = document.querySelectorAll("[data-fleet-card]");
    if (!filterBar || !cards.length) return;

    const buttons = filterBar.querySelectorAll("[data-filter]");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");

        const filter = btn.getAttribute("data-filter");
        cards.forEach((card) => {
          const category = card.getAttribute("data-category");
          const show = filter === "all" || category === filter;
          card.hidden = !show;
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Form validation & mock submission
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