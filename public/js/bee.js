/* ==========================================================================
   Bee Cee Logistics — bee.js
   Site-wide UI reactivity shared by every public page: active nav
   highlighting, mobile menu toggle, header scroll shadow, footer year.
   Page-specific business logic (forms, filters, dashboards) lives in cee.js.
   ========================================================================== */
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
   * Every nav link carries data-page="services.html" etc. We compare that
   * against the current file name so the same nav markup can be reused,
   * byte for byte, on every page instead of hand-editing "active" classes
   * per page.
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
