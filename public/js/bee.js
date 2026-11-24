/* ==========================================================================
   Bee Cee Logistics — bee.js
   Site-wide UI reactivity shared by every public page: active nav
   highlighting, mobile menu toggle, header scroll shadow, footer year.
   Page-specific business logic (forms, filters, dashboards) lives in cee.js.

   v2 note: only change from the previous version is inside setupMobileMenu
   — it now toggles a `menu-open` class on <body> so the page can't scroll
   behind the new full-height mobile panel (see [data-mobile-menu] in
   bee.css). Every selector, event and data-hook is otherwise unchanged.
   ========================================================================== */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    highlightActiveNavLink();
    setupMobileMenu();
    setupHeaderScrollShadow();
    setupYear();
    setupReveal();
    setupBackToTop();
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
      document.body.classList.toggle("menu-open", isOpen);
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
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      header.style.setProperty("--scroll-progress", String(progress));
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

  function setupReveal() {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = document.querySelectorAll("main section:not(.home-hero), body > section:not(.home-hero)");
    sections.forEach((section) => section.setAttribute("data-reveal", ""));
    document.documentElement.classList.add("reveal-ready");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px" });

    sections.forEach((section) => observer.observe(section));
  }

  function setupBackToTop() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "back-to-top";
    button.setAttribute("aria-label", "Back to top");
    button.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>';
    document.body.appendChild(button);

    function update() {
      button.classList.toggle("back-to-top--visible", window.scrollY > 600);
    }

    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    update();
    window.addEventListener("scroll", update, { passive: true });
  }
})();