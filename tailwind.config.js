const designTokens = require("./tailwind.tokens");

module.exports = {
  content: ["./public/**/*.html", "./public/**/*.js"],
  darkMode: designTokens.darkMode,
  theme: designTokens.theme,
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};
