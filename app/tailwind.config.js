/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", "[data-theme='dark']"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // PlayStation-inspired product colors
        cabinet: {
          bg: "hsl(var(--cabinet-bg) / <alpha-value>)",
          paper: "hsl(var(--cabinet-paper) / <alpha-value>)",
          ink: "hsl(var(--cabinet-ink) / <alpha-value>)",
          ink2: "hsl(var(--cabinet-ink2) / <alpha-value>)",
          inkMuted: "hsl(var(--cabinet-ink-muted) / <alpha-value>)",
          itemBg: "hsl(var(--cabinet-item-bg) / <alpha-value>)",
          border: "hsl(var(--cabinet-border) / <alpha-value>)",
          blue: "hsl(var(--cabinet-blue) / <alpha-value>)",
          cyan: "hsl(var(--cabinet-cyan) / <alpha-value>)",
          black: "hsl(var(--cabinet-black) / <alpha-value>)",
          muted: "hsl(var(--cabinet-muted) / <alpha-value>)",
          tab: {
            notes: "hsl(var(--cabinet-tab-notes) / <alpha-value>)",
            projects: "hsl(var(--cabinet-tab-projects) / <alpha-value>)",
            archive: "hsl(var(--cabinet-tab-archive) / <alpha-value>)",
          },
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "spin-refresh": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "tab-bounce": {
          "0%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-5px)" },
          "55%": { transform: "translateY(2px)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "spin-refresh": "spin-refresh 0.5s ease-in-out",
        "tab-bounce": "tab-bounce 0.35s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
