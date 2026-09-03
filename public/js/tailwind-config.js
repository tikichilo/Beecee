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
        "surface-bright": "#f8f9fa",
        "on-background": "#191c1d",
        "secondary": "#7b5800",
        "tertiary-fixed-dim": "#ffb783",
        "outline": "#74777f",
        "secondary-fixed-dim": "#f7bd48",
        "primary-fixed": "#E4EAC9",
        "inverse-primary": "#C2CE93",
        "on-tertiary-container": "#f2882c",
        "on-tertiary-fixed": "#301400",
        "surface-container-lowest": "#ffffff",
        "tertiary": "#3c1b00",
        "primary": "#3B4A1E",
        "on-error": "#ffffff",
        "primary-container": "#4E5A26",
        "surface": "#f8f9fa",
        "secondary-container": "#fdc34d",
        "on-surface": "#191c1d",
        "surface-tint": "#596A32",
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
        "primary-fixed-dim": "#C2CE93",
        "outline-variant": "#c4c6cf",
        "inverse-on-surface": "#f0f1f2",
        "surface-container-high": "#e7e8e9",
        "on-primary-container": "#B6C58C",
        "tertiary-fixed": "#ffdcc5",
        "on-error-container": "#93000a",
        "background": "#f8f9fa",
        "on-tertiary-fixed-variant": "#713700",
        "surface-container": "#edeeef",
        "on-secondary": "#ffffff",
        "surface-dim": "#d9dadb",
        "on-primary-fixed": "#16210C",
        "surface-container-highest": "#e1e3e4",
        "on-primary-fixed-variant": "#4A5426",
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
