import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // === Radius existants + radius KLYXOR ===
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        kly: "1rem",
        "kly-lg": "1.25rem",
      },

      // === Couleurs existantes + palette KLYXOR ===
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },

        // CLM specific colors
        success: "hsl(124, 55%, 24%)",
        warning: "hsl(35, 100%, 47%)",
        error: "hsl(354, 70%, 54%)",
        info: "hsl(204, 100%, 37%)",

        // 🎨 KLYXOR Design System (Clean SaaS Modern)
        klyxor: {
          primary: "#2F80ED",
          dark: "#0A2A43",
          accent: "#1E3A56",
          bg: "#F5F6F7",
          subtle: "#F9FAFB",
          card: "#FFFFFF",
          border: "#E5E7EB",
          text: "#1A1A1A",
          muted: "#6B7280",
        },

        // Legacy KLYXOR (dark theme - backward compat)
        kly: {
          bg: "#0D243D",
          surface: "#142B46",
          surfaceSoft: "#0F2A45",
          gold: "#D8B24A",
          goldHover: "#C7A040",
          text: {
            primary: "#F9FAFB",
            secondary: "#CBD5F5",
            muted: "#9CA3C7",
          },
          border: {
            soft: "rgba(255,255,255,0.08)",
            strong: "rgba(255,255,255,0.16)",
          },
          success: "#22C55E",
          warning: "#FACC15",
          danger: "#F87171",
          info: "#38BDF8",
        },
      },

      // === Shadows (KLYXOR Design System) ===
      boxShadow: {
        card: "0 4px 12px rgba(0,0,0,0.05)",
        hover: "0 6px 20px rgba(0,0,0,0.07)",
        modal: "0 12px 30px rgba(0,0,0,0.12)",
        "kly-card": "0 18px 45px rgba(0, 0, 0, 0.45)",
      },

      // === Font ===
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },

      // === Animations existantes (accordion) ===
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
