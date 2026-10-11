/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      colors: {
        // Main Background: Cloud Gray System (non-pale, comforting, non-sterile)
        cloudGray: {
          DEFAULT: '#E8ECEF',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E8ECEF',
          300: '#DFE4E8',
          400: '#D1D7DE',
          500: '#B8C0CA',
          card: '#FFFFFF',
          sidebar: '#DEE3E9',
          border: '#DCE2EA',
          borderSubtle: '#EAEFF5',
          row: '#F8FAFC',
        },
        // Primary Interactive 1: Tranquil Blue
        tranquil: {
          50: '#F0F5FA',
          100: '#E0ECF6',
          200: '#BFD9EE',
          300: '#98C1E4',
          400: '#6FA4D4',
          500: '#4A7BB0',
          600: '#396696',
          700: '#2C5077',
          800: '#203C59',
          900: '#172C42',
        },
        // Primary Interactive 2: Soft Mint Green
        softMint: {
          50: '#F0F7F4',
          100: '#DCEDE4',
          200: '#B8DBC9',
          300: '#92C6AB',
          400: '#6DAE8C',
          500: '#4A9671',
          600: '#387E5D',
          700: '#2B6449',
          800: '#1F4A36',
          900: '#153325',
        },
        // Accent 1 (used sparingly): Lavender
        lavender: {
          50: '#F6F3FB',
          100: '#EAE4F6',
          200: '#D5C8EE',
          300: '#BAA5E2',
          500: '#876EBA',
          600: '#7056A4',
          700: '#594285',
          800: '#443267',
        },
        // Accent 2 (used sparingly): Peach
        peach: {
          50: '#FDF4EF',
          100: '#FCE5DB',
          200: '#F7C7B2',
          300: '#F1A686',
          500: '#E07E56',
          600: '#C8663D',
          700: '#A6502D',
          800: '#833D20',
        },
        // Deep Comforting Slate Ink
        slateInk: {
          DEFAULT: '#18202A',
          900: '#18202A',
          800: '#263240',
          700: '#394758',
          600: '#4F5F73',
          500: '#6B7B91',
          400: '#8E9CAE',
          300: '#B5C1CF',
          200: '#D2D9E2',
          100: '#E6ECF2',
        },
        // Retain legacy aliases pointing to the new palette to avoid breaks
        stoneInk: {
          900: '#18202A',
          800: '#263240',
          700: '#394758',
          500: '#6B7B91',
          400: '#8E9CAE',
          300: '#B5C1CF',
        },
        sage: {
          50: '#F0F7F4',
          100: '#DCEDE4',
          200: '#B8DBC9',
          600: '#387E5D',
          700: '#2B6449',
          800: '#1F4A36',
        },
        terracotta: {
          50: '#FDF4EF',
          100: '#FCE5DB',
          200: '#F7C7B2',
          600: '#C8663D',
          700: '#A6502D',
          800: '#833D20',
        },
        mist: {
          50: '#F0F5FA',
          100: '#E0ECF6',
          200: '#BFD9EE',
          600: '#396696',
          700: '#2C5077',
        },
        linen: {
          50: '#F2F5F8',
          100: '#E8ECEF',
          200: '#DFE4E8',
          300: '#D1D7DE',
        }
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(24, 32, 42, 0.04), 0 1px 2px rgba(24, 32, 42, 0.02)',
        'card': '0 4px 16px -2px rgba(24, 32, 42, 0.05), 0 2px 4px -1px rgba(24, 32, 42, 0.02)',
        'float': '0 16px 36px -6px rgba(20, 27, 36, 0.12)',
      }
    },
  },
  plugins: [],
}
