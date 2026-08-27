/* ============================================================
   Bee Cee Logistics — Shared Admin Shell
   Injects the sidebar nav into #adminSidebarRoot, guards the page
   behind a logged-in session, fills in #whoami, and wires logout.
   Usage: AdminShell.init("/admin/dashboard");
   ============================================================ */

(function (window, document) {
  "use strict";

  const NAV_ITEMS = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "space_dashboard" },
    { href: "/admin/fleet", label: "Fleet", icon: "directions_car" },
    { href: "/admin/bookings", label: "Bookings", icon: "event_available" },
    { href: "/admin/quotes", label: "Quote Requests", icon: "request_quote" },
    { href: "/admin/receipts", label: "Receipts", icon: "receipt_long" },
  ];

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function buildSidebar(activePath) {
    const root = document.getElementById("adminSidebarRoot");
    if (!root) return null;

    // Fall back to the current path if the page didn't pass one in,
    // and match by prefix so a future nested route (e.g.
    // /admin/fleet/123) still highlights its parent nav item.
    const currentPath = activePath || window.location.pathname;

    const linksHtml = NAV_ITEMS.map((item) => {
      const isActive = currentPath === item.href || currentPath.startsWith(item.href + "/");
      return `
        <a href="${item.href}" class="admin-sidebar__link${isActive ? " is-active" : ""}"${isActive ? ' aria-current="page"' : ""}>
          <span class="material-symbols-outlined" aria-hidden="true">${item.icon}</span>
          <span>${item.label}</span>
        </a>`;
    }).join("");

    root.innerHTML = `
      <div class="admin-sidebar__scrim" id="adminSidebarScrim"></div>
      <nav class="admin-sidebar" id="adminSidebar" aria-label="Admin navigation">
        <div class="admin-sidebar__brand">
          <img src="/admin/logo.png" alt="Bee Cee Logistics" class="admin-sidebar__brand-logo" id="adminSidebarLogo"/>
          <span class="admin-sidebar__brand-mark" aria-hidden="true" id="adminSidebarBrandFallback" hidden>BC</span>
          <span class="admin-sidebar__brand-text">Bee Cee<br/>Logistics</span>
        </div>
        <div class="admin-sidebar__nav">${linksHtml}</div>
        <div class="admin-sidebar__footer">
          <button type="button" class="admin-sidebar__logout" id="adminLogoutBtn">
            <span class="material-symbols-outlined" aria-hidden="true" style="font-size:17px">logout</span>
            <span>Log Out</span>
          </button>
        </div>
      </nav>`;

    // If logo.png is ever missing or fails to load, fall back to the
    // "BC" letter mark instead of showing a broken image icon.
    const logoImg = document.getElementById("adminSidebarLogo");
    const brandFallback = document.getElementById("adminSidebarBrandFallback");
    if (logoImg && brandFallback) {
      logoImg.addEventListener("error", () => {
        logoImg.hidden = true;
        brandFallback.hidden = false;
      });
    }

    return {
      sidebar: document.getElementById("adminSidebar"),
      scrim: document.getElementById("adminSidebarScrim"),
      logoutBtn: document.getElementById("adminLogoutBtn"),
    };
  }

  function injectMobileToggle() {
    const topbar = document.querySelector(".admin-topbar");
    if (!topbar || document.getElementById("adminSidebarToggle")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "adminSidebarToggle";
    btn.className = "admin-sidebar__toggle";
    btn.setAttribute("aria-label", "Open navigation menu");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">menu</span>';

    const heading = topbar.querySelector(":scope > div") || topbar.firstElementChild;
    if (heading) {
      const wrap = document.createElement("div");
      wrap.className = "admin-topbar__heading";
      heading.parentNode.insertBefore(wrap, heading);
      wrap.appendChild(btn);
      wrap.appendChild(heading);
    } else {
      topbar.prepend(btn);
    }

    return btn;
  }

  function wireMobileToggle(els) {
    const toggleBtn = injectMobileToggle();
    if (!toggleBtn || !els) return;

    function open() {
      els.sidebar.classList.add("is-open");
      els.scrim.classList.add("is-visible");
      toggleBtn.setAttribute("aria-expanded", "true");
    }
    function close() {
      els.sidebar.classList.remove("is-open");
      els.scrim.classList.remove("is-visible");
      toggleBtn.setAttribute("aria-expanded", "false");
    }

    toggleBtn.addEventListener("click", () => {
      const isOpen = els.sidebar.classList.contains("is-open");
      isOpen ? close() : open();
    });
    els.scrim.addEventListener("click", close);
    els.sidebar.querySelectorAll(".admin-sidebar__link").forEach((link) => {
      link.addEventListener("click", close);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.sidebar.classList.contains("is-open")) close();
    });
  }

  async function guardAndLoadUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        window.location.href = "/admin";
        return null;
      }
      const data = await res.json();
      if (!data.loggedIn) {
        window.location.href = "/admin";
        return null;
      }
      const whoami = document.getElementById("whoami");
      if (whoami) whoami.textContent = "Logged in as " + escapeHtml(data.username);
      return data;
    } catch (err) {
      window.location.href = "/admin";
      return null;
    }
  }

  function wireLogout(els) {
    if (!els || !els.logoutBtn) return;
    els.logoutBtn.addEventListener("click", async () => {
      if (els.logoutBtn.disabled) return; // guard against double-click spam
      els.logoutBtn.disabled = true;
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        window.location.href = "/admin";
      }
    });
  }

  function init(activePath) {
    const els = buildSidebar(activePath);
    wireMobileToggle(els);
    wireLogout(els);
    guardAndLoadUser();
  }

  window.AdminShell = { init };
})(window, document);