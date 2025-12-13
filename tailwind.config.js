/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#f5f4f2', // Off-white with subtle warm tint
        wood: '#2a2825', // Near-black with warm undertone
      },
      fontFamily: {
        vintage: ['var(--font-playfair)', 'serif'],
      },
    },
  },
  plugins: [],
}

