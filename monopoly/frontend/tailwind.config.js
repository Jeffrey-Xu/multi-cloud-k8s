/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        monopoly: {
          green: '#00A651',
          red: '#E31E24',
          blue: '#0066CC',
          yellow: '#FFED00',
          orange: '#FF8C00',
          brown: '#8B4513',
          pink: '#FF69B4',
          light: '#87CEEB',
        }
      },
      animation: {
        'dice-roll': 'spin 0.5s ease-in-out',
        'piece-move': 'bounce 0.3s ease-in-out',
      }
    },
  },
  plugins: [],
}
