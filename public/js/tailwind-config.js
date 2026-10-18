/* ==========================================================================
   Bee Cee Logistics — tailwind-config.js
   Tailwind CDN (Play CDN / JIT) design-token config. Load this AFTER the
   cdn.tailwindcss.com <script> tag and BEFORE your page markup needs any
   utility classes that depend on these tokens (colors, spacing, fonts).
   One copy, shared by every public page — edit brand colors/fonts here once.
   ========================================================================== */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-bright": "var(--color-surface-bright)",
        "on-background": "var(--color-on-background)",
        "secondary": "var(--color-secondary)",
        "tertiary-fixed-dim": "var(--color-tertiary-fixed-dim)",
        "outline": "var(--color-outline)",
        "secondary-fixed-dim": "var(--color-secondary-fixed-dim)",
        "primary-fixed": "var(--color-primary-fixed)",
        "inverse-primary": "var(--color-inverse-primary)",
        "on-tertiary-container": "var(--color-on-tertiary-container)",
        "on-tertiary-fixed": "var(--color-on-tertiary-fixed)",
        "surface-container-lowest": "var(--color-surface-container-lowest)",
        "tertiary": "var(--color-tertiary)",
        "primary": "var(--color-primary)",
        "on-error": "var(--color-on-error)",
        "primary-container": "var(--color-primary-container)",
        "surface": "var(--color-surface)",
        "secondary-container": "var(--color-secondary-container)",
        "on-surface": "var(--color-on-surface)",
        "surface-tint": "var(--color-surface-tint)",
        "on-primary": "var(--color-on-primary)",
        "on-secondary-fixed-variant": "var(--color-on-secondary-fixed-variant)",
        "secondary-fixed": "var(--color-secondary-fixed)",
        "tertiary-container": "var(--color-tertiary-container)",
        "error": "var(--color-error)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        "on-tertiary": "var(--color-on-tertiary)",
        "on-secondary-container": "var(--color-on-secondary-container)",
        "surface-container-low": "var(--color-surface-container-low)",
        "error-container": "var(--color-error-container)",
        "inverse-surface": "var(--color-inverse-surface)",
        "surface-variant": "var(--color-surface-variant)",
        "primary-fixed-dim": "var(--color-primary-fixed-dim)",
        "outline-variant": "var(--color-outline-variant)",
        "inverse-on-surface": "var(--color-inverse-on-surface)",
        "surface-container-high": "var(--color-surface-container-high)",
        "on-primary-container": "var(--color-on-primary-container)",
        "tertiary-fixed": "var(--color-tertiary-fixed)",
        "on-error-container": "var(--color-on-error-container)",
        "background": "var(--color-background)",
        "on-tertiary-fixed-variant": "var(--color-on-tertiary-fixed-variant)",
        "surface-container": "var(--color-surface-container)",
        "on-secondary": "var(--color-on-secondary)",
        "surface-dim": "var(--color-surface-dim)",
        "on-primary-fixed": "var(--color-on-primary-fixed)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        "on-primary-fixed-variant": "var(--color-on-primary-fixed-variant)",
        "on-secondary-fixed": "var(--color-on-secondary-fixed)",
        "success": "var(--color-success)",
        "success-container": "var(--color-success-container)",
        "on-success-container": "var(--color-on-success-container)"
      },
      borderRadius: {
        DEFAULT: "var(--radius-control)",
        sm: "var(--radius-control)",
        md: "var(--radius-card)",
        lg: "var(--radius-card)",
        xl: "var(--radius-card)",
        "2xl": "var(--radius-feature)",
        feature: "var(--radius-feature)",
        full: "var(--radius-pill)",
        circle: "var(--radius-circle)"
      },
      spacing: {
        "container-max": "var(--container-max)",
        unit: "var(--space-unit)",
        "margin-mobile": "var(--page-margin-mobile)",
        "margin-desktop": "var(--page-margin-desktop)",
        gutter: "var(--space-gutter)",
        section: "var(--section-padding)"
      },
      fontFamily: {
        "body-lg": ["var(--font-body)"],
        "display-lg": ["var(--font-display)"],
        "label-sm": ["var(--font-body)"],
        "body-md": ["var(--font-body)"],
        "display-lg-mobile": ["var(--font-display)"],
        "headline-md": ["var(--font-display)"],
        "data-mono": ["var(--font-body)"]
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-lg": ["48px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "label-sm": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "display-lg-mobile": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "data-mono": ["14px", { lineHeight: "1.4", fontWeight: "500" }]
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)"
      }
    }
  }
};
