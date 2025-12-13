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
        parchment: '#c9b99b', // Darker grayish-brown with warm undertone
        wood: '#2a2825', // Near-black with warm undertone
      },
      fontFamily: {
        vintage: ['var(--font-playfair)', 'serif'],
        music: ['var(--font-crimson)', 'Crimson Text', 'Georgia', 'serif'],
        chord: ['var(--font-crimson)', 'Crimson Text', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

