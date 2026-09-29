/** @type {import('tailwindcss').Config} */
/**
 * NAVO LIVE — White Theme design tokens (requirement #7)
 *
 * Background  #FFFFFF
 * Text        #000000
 * Secondary   #666666
 * Button      #000000 with white text
 * Light mode only — no dark mode.
 *
 * NOTE: the legacy `dark-*` scale is kept but INVERTED, so screens that have not
 * been hand-rewritten yet still render on a light surface instead of breaking.
 * New code should use the semantic tokens: surface / ink / muted / line / accent.
 */
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  content: [
    path.resolve(__dirname, './index.html'),
    path.resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        /* ── Semantic tokens (use these in new code) ───────────── */
        surface: {
          DEFAULT: '#FFFFFF', // page + card background
          soft: '#F7F8FA', // grouped section background
          sunken: '#F1F2F6', // inputs, inactive chips
          raised: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#000000', // primary text
          soft: '#333333',
          muted: '#666666', // secondary text (requirement)
          faint: '#999999', // tertiary / placeholder
          ghost: '#BBBBBB',
        },
        line: {
          DEFAULT: '#EFEFF4', // hairline divider
          strong: '#E2E3EA',
        },
        accent: {
          50: '#EEF0FF',
          100: '#DFE3FF',
          200: '#C2C8FF',
          300: '#9BA4FF',
          400: '#7A81FA',
          500: '#5B5BF5', // Poppo indigo — active tab, links
          600: '#4A45E0',
          700: '#3B36BC',
        },

        /* ── Role + status colours (requirement #3) ────────────── */
        role: {
          host: '#E5342F', // HOST  = red
          agent: '#2F80ED', // AGENT = blue
          seller: '#F5A623', // COIN SELLER = gold
          official: '#1D9BF0', // OFFICIAL = blue tick
        },
        status: {
          online: '#22C55E',
          offline: '#B0B3BD',
          live: '#FF3B30',
        },
        vip: {
          DEFAULT: '#8B5CF6',
          gold: '#E0A83C',
        },

        /* ── Brand accents kept for gifts / games / currency ───── */
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        coin: '#F5A623',
        diamond: '#2AB6E4',

        /* ── LEGACY (inverted) — do not use in new code ────────── */
        dark: {
          50: '#0B0B0F',
          100: '#1A1B26',
          200: '#333333',
          300: '#4A4A55',
          400: '#666666',
          500: '#8A8D96',
          600: '#B0B3BD',
          700: '#E2E3EA',
          800: '#EFEFF4',
          900: '#F7F8FA',
          950: '#FFFFFF',
        },
        brand: {
          bg: '#FFFFFF',
          primary: '#5B5BF5',
          secondary: '#7A81FA',
          accent: '#2AB6E4',
          success: '#22C55E',
          warning: '#F5A623',
          danger: '#E5342F',
          glow: '#5B5BF5',
          surface: '#FFFFFF',
          surface2: '#F7F8FA',
          border: '#EFEFF4',
          textPrimary: '#000000',
          textSecondary: '#666666',
        },
      },

      boxShadow: {
        /* Soft, light-theme elevation — replaces the old neon glows */
        card: '0 1px 2px rgba(16, 18, 32, 0.04), 0 8px 24px rgba(16, 18, 32, 0.06)',
        'card-hover': '0 2px 4px rgba(16, 18, 32, 0.06), 0 12px 32px rgba(16, 18, 32, 0.10)',
        sheet: '0 -4px 24px rgba(16, 18, 32, 0.08)',
        nav: '0 -1px 0 #EFEFF4',
        pill: '0 2px 8px rgba(16, 18, 32, 0.08)',
        glow: '0 6px 20px rgba(91, 91, 245, 0.28)',
        'glow-sm': '0 3px 10px rgba(91, 91, 245, 0.20)',
        'glow-lg': '0 10px 32px rgba(91, 91, 245, 0.32)',
        'glow-cyan': '0 6px 20px rgba(42, 182, 228, 0.28)',
        'glow-pink': '0 6px 20px rgba(236, 72, 153, 0.28)',
        'glow-gold': '0 6px 20px rgba(245, 166, 35, 0.28)',
      },

      borderRadius: {
        card: '16px',
        sheet: '20px',
      },

      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },

      keyframes: {
        'float-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-120px) scale(1.1)', opacity: '0' },
        },
        'heart-float': {
          '0%': { transform: 'translateY(0) translateX(0) scale(0.6)', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { transform: 'translateY(-140px) translateX(var(--drift, 12px)) scale(1.1)', opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 4px 14px rgba(91,91,245,0.22)' },
          '50%': { boxShadow: '0 8px 26px rgba(91,91,245,0.40)' },
        },
        'gift-shine': {
          '0%': { transform: 'translateX(-150%) rotate(12deg)' },
          '100%': { transform: 'translateX(150%) rotate(12deg)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.45' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'gradient-move': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'float-up': 'float-up 1.4s ease-out forwards',
        'heart-float': 'heart-float 1.6s ease-out forwards',
        shimmer: 'shimmer 1.8s linear infinite',
        'gradient-shift': 'gradient-shift 4s ease infinite',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'gift-shine': 'gift-shine 1.2s ease-in-out infinite',
        ripple: 'ripple 0.6s ease-out forwards',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float-slow 4s ease-in-out infinite',
        'gradient-move': 'gradient-move 6s ease infinite',
        'slide-up': 'slide-up 0.22s ease-out',
      },
      backgroundSize: {
        '200%': '200% 200%',
      },
    },
  },
  plugins: [],
};
