/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#03001e",
          card: "rgba(10, 10, 35, 0.45)",
          border: "rgba(0, 242, 254, 0.15)",
          text: "#e0e0ff",
          blue: "#00f2fe",
          purple: "#9b5de5",
          pink: "#f15bb5",
          cyan: "#00f5d4",
          yellow: "#fee440",
          indigo: "#4f46e5"
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(0, 242, 254, 0.35)',
        'glow-purple': '0 0 20px rgba(155, 93, 229, 0.35)',
        'glow-cyan': '0 0 20px rgba(0, 245, 212, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'hologram': 'hologram 8s linear infinite',
        'glitch': 'glitch 1s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        hologram: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' }
        }
      }
    },
  },
  plugins: [],
}
