/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./views/**/*.ejs",
    "./js/**/*.js"
  ],
  safelist: [
    // Badges de status de reserva (gerados dinamicamente em config.js)
    { pattern: /^bg-(yellow|green|blue|red|orange|purple|slate|gray)-(100|200|500)\/(10|20|30|40)$/ },
    { pattern: /^text-(yellow|green|blue|red|orange|purple|slate|gray)-(300|400|600|800)$/ },
    { pattern: /^border-(yellow|green|blue|red|orange|purple|slate|gray)-(300|400|500)\/(40)$/ },
    // Classes que podem não estar no HTML mas são usadas via JS
    'bg-yellow-500/20', 'text-yellow-300', 'border-yellow-500/40',
    'bg-orange-500/20', 'text-orange-300', 'border-orange-500/40',
    'bg-green-500/20',  'text-green-300',  'border-green-500/40',
    'bg-blue-500/20',   'text-blue-300',   'border-blue-500/40',
    'bg-slate-500/20',  'text-slate-300',  'border-slate-500/40',
    'bg-slate-500/10',  'text-slate-400',
    'bg-purple-500/20', 'text-purple-300', 'border-purple-500/40',
    'bg-red-500/20',    'text-red-300',    'border-red-500/40',
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary-fixed": "#859aff", "outline-variant": "#414859", "on-secondary-fixed": "#004529", "secondary-container": "#006d43",
        "error-container": "#a70138", "on-surface-variant": "#a4abbf", "inverse-primary": "#134af1", "surface-container-lowest": "#000000",
        "on-error-container": "#ffb2b9", "error": "#ff6e84", "secondary": "#52f9a8", "secondary-fixed-dim": "#3eea9b",
        "tertiary-fixed": "#f790e0", "on-primary-container": "#001867", "on-primary": "#002283", "on-tertiary": "#6c1561",
        "on-secondary-container": "#e2ffe9", "primary-fixed-dim": "#718bff", "tertiary-dim": "#e883d2", "surface-dim": "#070e1d",
        "surface-container-low": "#0b1323", "on-tertiary-fixed-variant": "#6a1460", "tertiary-fixed-dim": "#e883d2", "secondary-fixed": "#52f9a8",
        "primary-container": "#859aff", "on-background": "#dfe5fa", "surface-container-highest": "#1b263b", "surface-container": "#11192b",
        "on-tertiary-container": "#5f0656", "on-error": "#490013", "background": "#070e1d", "on-secondary-fixed-variant": "#00653e",
        "surface-tint": "#97a9ff", "on-tertiary-fixed": "#380033", "on-primary-fixed": "#000000", "on-surface": "#dfe5fa",
        "primary": "#97a9ff", "surface-container-high": "#161f33", "error-dim": "#d73357", "secondary-dim": "#3eea9b",
        "surface-variant": "#1b263b", "primary-dim": "#3e65ff", "inverse-surface": "#f9f9ff", "surface-bright": "#212c43",
        "on-secondary": "#005a37", "tertiary-container": "#f790e0", "surface": "#070e1d", "inverse-on-surface": "#4e5566",
        "outline": "#6e7588", "tertiary": "#ffa3e9", "on-primary-fixed-variant": "#00207e"
      },
      fontFamily: { "headline": ["Inter"], "body": ["Inter"], "label": ["Inter"] },
      borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
