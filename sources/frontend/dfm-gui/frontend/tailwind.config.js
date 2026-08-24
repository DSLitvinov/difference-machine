/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: {
          DEFAULT: "var(--background-default)",
          muted: "var(--background-muted)",
          primary: "var(--background-primary-default)",
          light: "var(--background-primary-light)",
        },
        foreground: {
          DEFAULT: "var(--foreground-default)",
          muted: "var(--foreground-muted)",
          secondary: "var(--foreground-secondary)",
          primary: "var(--foreground-primary-default)",
          disabled: "var(--foreground-disabled)",
          accent: "var(--foreground-accent-light)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          accent: "var(--border-accent)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
