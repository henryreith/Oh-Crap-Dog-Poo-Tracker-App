/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        primary_light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        primary_dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',

        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        surface_highlight: 'rgb(var(--color-surface-highlight) / <alpha-value>)',

        text_primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
        text_secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        text_muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        text_on_primary: 'rgb(var(--color-text-on-primary) / <alpha-value>)',

        border: 'rgb(var(--color-border) / <alpha-value>)',
        
        error: 'rgb(var(--color-error) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
