(function () {
  "use strict";

  const mountedRoots = new Map();
  const DAY_IN_MS = 24 * 60 * 60 * 1000;

  function CategoryTag(props) {
    const available = props.acceptingBookings;
    const ageInDays = Math.floor((Date.now() - props.updatedAt) / DAY_IN_MS);
    const isNew = props.createdWithinThirtyDays;
    const rateText = getRateText(props.minRate, props.maxRate);
    const statusClasses = available
      ? "bg-primary-container text-on-primary-container"
      : "bg-surface-container text-on-surface-variant";
    const dotClass = available ? "bg-primary" : "bg-on-surface-variant";

    return window.React.createElement(
      "div",
      {
        className: "flex flex-col items-end gap-1 text-right",
        "aria-label": `${props.label} (${props.category})`,
      },
      window.React.createElement(
        "span",
        {
          className: `inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${statusClasses}`,
          "aria-label": available ? "Available" : "Unavailable",
        },
        window.React.createElement("span", {
          className: `h-2 w-2 rounded-full ${dotClass}`,
          "aria-hidden": "true",
        }),
        available ? "Available" : "Unavailable"
      ),
      window.React.createElement(
        "span",
        { className: "text-xs font-medium text-on-surface-variant" },
        rateText
      ),
      isNew
        ? window.React.createElement(
            "span",
            {
              className: "text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container",
            },
            "New"
          )
        : null,
      window.React.createElement(
        "span",
        { className: "text-[10px] text-on-surface-variant" },
        `Updated ${ageInDays} ${ageInDays === 1 ? "day" : "days"} ago`
      )
    );
  }

  function getRateText(minRate, maxRate) {
    if (minRate === null || maxRate === null || (minRate === 0 && maxRate === 0)) {
      return "Contact for rate";
    }
    if (minRate === maxRate) {
      return `From K${minRate.toLocaleString()}`;
    }
    return `K${minRate.toLocaleString()} - K${maxRate.toLocaleString()}`;
  }

  function readCategoryTagData(element) {
    const label = element.getAttribute("data-label");
    const category = element.getAttribute("data-category");
    const acceptingBookingsValue = element.getAttribute("data-accepting-bookings");
    const createdAtValue = element.getAttribute("data-created-at");
    const updatedAtValue = element.getAttribute("data-updated-at");
    const minRateValue = element.getAttribute("data-min-rate");
    const maxRateValue = element.getAttribute("data-max-rate");

    if (
      !label ||
      !category ||
      (acceptingBookingsValue !== "true" && acceptingBookingsValue !== "false") ||
      !createdAtValue ||
      !updatedAtValue
    ) {
      return null;
    }

    if (typeof label !== "string" || typeof category !== "string") return null;

    const createdAt = Date.parse(createdAtValue);
    const updatedAt = Date.parse(updatedAtValue);
    if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return null;

    const now = Date.now();
    if (createdAt > now || updatedAt > now) return null;

    const minRate = parseRate(minRateValue);
    const maxRate = parseRate(maxRateValue);
    if (minRate === undefined || maxRate === undefined) return null;
    if (minRate !== null && maxRate !== null && maxRate < minRate) return null;

    return {
      label,
      category,
      acceptingBookings: acceptingBookingsValue === "true",
      createdWithinThirtyDays: now - createdAt <= 30 * DAY_IN_MS,
      updatedAt,
      minRate,
      maxRate,
    };
  }

  function parseRate(value) {
    if (value === null || value === "") return null;
    const rate = Number(value);
    return Number.isFinite(rate) && rate >= 0 ? rate : undefined;
  }

  function mountCategoryTags(container) {
    if (
      !container ||
      !window.React ||
      !window.ReactDOM ||
      typeof window.ReactDOM.createRoot !== "function"
    ) {
      return;
    }

    container.querySelectorAll("[data-category-tag]").forEach((element) => {
      if (mountedRoots.has(element)) return;

      const props = readCategoryTagData(element);
      if (!props) return;

      const fallbackMarkup = element.innerHTML;
      let root;
      try {
        root = window.ReactDOM.createRoot(element);
        mountedRoots.set(element, root);
        root.render(window.React.createElement(CategoryTag, props));
      } catch (error) {
        if (root) {
          mountedRoots.delete(element);
          try {
            root.unmount();
          } catch (unmountError) {
            console.error("Could not clean up a failed fleet category tag.", unmountError);
          }
        }
        element.innerHTML = fallbackMarkup;
        console.error("Could not render fleet category tag with React.", error);
      }
    });
  }

  function unmountCategoryTags(container) {
    if (!container) return;

    for (const [element, root] of mountedRoots) {
      if (!container.contains(element)) continue;
      root.unmount();
      mountedRoots.delete(element);
    }
  }

  window.BeeCeeCategoryTags = { mountCategoryTags, unmountCategoryTags };
})();
