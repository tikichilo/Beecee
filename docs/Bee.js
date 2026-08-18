/* ==========================================================================
   Bee Cee Logistics — bee.js
   Design-system config (Tailwind theme tokens) + site-wide UI reactivity.
   Page-specific business logic (forms, filters, dashboards) lives in cee.js.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. Tailwind design tokens (single source of truth for every page)
   -------------------------------------------------------------------------- */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-bright": "#f8f9fa",
        "on-background": "#191c1d",
        "secondary": "#7b5800",
        "tertiary-fixed-dim": "#ffb783",
        "outline": "#74777f",
        "secondary-fixed-dim": "#f7bd48",
        "primary-fixed": "#d5e3ff",
        "inverse-primary": "#aec8f4",
        "on-tertiary-container": "#f2882c",
        "on-tertiary-fixed": "#301400",
        "surface-container-lowest": "#ffffff",
        "tertiary": "#3c1b00",
        "primary": "#032448",
        "on-error": "#ffffff",
        "primary-container": "#1f3a5f",
        "surface": "#f8f9fa",
        "secondary-container": "#fdc34d",
        "on-surface": "#191c1d",
        "surface-tint": "#465f86",
        "on-primary": "#ffffff",
        "on-secondary-fixed-variant": "#5d4200",
        "secondary-fixed": "#ffdea6",
        "tertiary-container": "#5d2c00",
        "error": "#ba1a1a",
        "on-surface-variant": "#43474e",
        "on-tertiary": "#ffffff",
        "on-secondary-container": "#715000",
        "surface-container-low": "#f3f4f5",
        "error-container": "#ffdad6",
        "inverse-surface": "#2e3132",
        "surface-variant": "#e1e3e4",
        "primary-fixed-dim": "#aec8f4",
        "outline-variant": "#c4c6cf",
        "inverse-on-surface": "#f0f1f2",
        "surface-container-high": "#e7e8e9",
        "on-primary-container": "#8ba4cf",
        "tertiary-fixed": "#ffdcc5",
        "on-error-container": "#93000a",
        "background": "#f8f9fa",
        "on-tertiary-fixed-variant": "#713700",
        "surface-container": "#edeeef",
        "on-secondary": "#ffffff",
        "surface-dim": "#d9dadb",
        "on-primary-fixed": "#001c3b",
        "surface-container-highest": "#e1e3e4",
        "on-primary-fixed-variant": "#2d476d",
        "on-secondary-fixed": "#271900",
        "success": "#146c2e",
        "success-container": "#d1f4e0",
        "on-success-container": "#0e613b"
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      },
      spacing: {
        "container-max": "1280px",
        unit: "8px",
        "margin-mobile": "16px",
        "margin-desktop": "40px",
        gutter: "24px"
      },
      fontFamily: {
        "body-lg": ["Inter"],
        "display-lg": ["Montserrat"],
        "label-sm": ["Inter"],
        "body-md": ["Inter"],
        "display-lg-mobile": ["Montserrat"],
        "headline-md": ["Montserrat"],
        "data-mono": ["Inter"]
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-lg": ["48px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "label-sm": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "display-lg-mobile": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "data-mono": ["14px", { lineHeight: "1.4", fontWeight: "500" }]
      }
    }
  }
};

/* --------------------------------------------------------------------------
   2. Site-wide reactivity
   -------------------------------------------------------------------------- */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    highlightActiveNavLink();
    setupMobileMenu();
    setupHeaderScrollShadow();
    setupYear();
  }

  /**
   * Every nav link carries data-page="services" etc. We compare that against
   * the current file name so the same nav markup can be reused, byte for
   * byte, on every page instead of hand-editing "active" classes per page.
   */
  function highlightActiveNavLink() {
    const current = (location.pathname.split("/").pop() || "index.html") || "index.html";

    document.querySelectorAll("[data-page]").forEach((link) => {
      const isActive = link.getAttribute("data-page") === current;
      link.classList.toggle("nav-link--active", isActive);
      link.classList.toggle("nav-link--inactive", !isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  /**
   * Hamburger toggle shared by every page that has a mobile nav drawer.
   * Markup contract:
   *   <button data-menu-toggle aria-controls="mobile-menu" aria-expanded="false">
   *   <div id="mobile-menu" data-mobile-menu hidden> ... </div>
   */
  function setupMobileMenu() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-mobile-menu]");
    if (!toggle || !menu) return;

    const openIcon = toggle.querySelector("[data-icon-open]");
    const closeIcon = toggle.querySelector("[data-icon-close]");

    function setState(isOpen) {
      toggle.setAttribute("aria-expanded", String(isOpen));
      menu.hidden = !isOpen;
      menu.classList.toggle("mobile-menu--open", isOpen);
      if (openIcon && closeIcon) {
        openIcon.classList.toggle("hidden", isOpen);
        closeIcon.classList.toggle("hidden", !isOpen);
      }
    }

    toggle.addEventListener("click", () => {
      setState(menu.hidden);
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setState(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) setState(false);
    });
  }

  /** Adds a subtle shadow to the fixed header once the page has scrolled. */
  function setupHeaderScrollShadow() {
    const header = document.querySelector("[data-site-header]");
    if (!header) return;

    function update() {
      header.classList.toggle("site-header--scrolled", window.scrollY > 8);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /** Keeps every footer's © year correct without hand-editing each page. */
  function setupYear() {
    document.querySelectorAll("[data-current-year]").forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }
})();