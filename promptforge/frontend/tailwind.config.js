/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#03050a",
        "void-light": "#0a0d14",
        cyan: "#00F0FF",
        magenta: "#FF0055",
        amber: "#FFB800",
        glass: "rgba(255,255,255,0.03)",
        "glass-hover": "rgba(255,255,255,0.06)",
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        jetbrains: ["JetBrains Mono", "monospace"],
        rajdhani: ["Rajdhani", "sans-serif"],
        myanmar: ["Noto Sans Myanmar", "sans-serif"],
      },
      animation: {
        "border-pulse": "borderPulse 2.5s ease-in-out infinite",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
        "flicker-in": "flickerIn 0.4s ease-out forwards",
        "slide-up": "slideUpFade 0.4s ease-out forwards",
        shimmer: "shimmer 3s ease-in-out infinite",
        "data-flow": "dataFlow 3s linear infinite",
        "scanline-move": "scanlineMove 8s linear infinite",
        blink: "blink 1s step-end infinite",
        "hex-pulse": "hexPulse 3s ease-in-out infinite",
      },
      keyframes: {
        borderPulse: {
          "0%, 100%": { borderColor: "rgba(0,240,255,0.2)" },
          "50%": { borderColor: "rgba(0,240,255,0.5)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(0,240,255,0.3), 0 0 24px rgba(0,240,255,0.1)" },
          "50%": { boxShadow: "0 0 16px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.2)" },
        },
        flickerIn: {
          "0%": { opacity: "0", filter: "blur(4px)" },
          "60%": { opacity: "0.8", filter: "blur(1px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
        slideUpFade: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%) skewX(-15deg)" },
          "100%": { transform: "translateX(200%) skewX(-15deg)" },
        },
        dataFlow: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
        scanlineMove: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        hexPulse: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        },
      },
      borderRadius: {
        panel: "12px",
      },
      boxShadow: {
        "cyan-glow": "0 0 20px rgba(0, 240, 255, 0.15), 0 0 60px rgba(0, 240, 255, 0.05)",
        "magenta-glow": "0 0 20px rgba(255, 0, 85, 0.15), 0 0 60px rgba(255, 0, 85, 0.05)",
        "panel": "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 240, 255, 0.03)",
      },
    },
  },
  plugins: [],
};
