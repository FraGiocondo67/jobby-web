import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colori brand JOBBY (stessi dell'app mobile)
        accent:  '#E25C45',  // arancione JOBBY
        blue:    '#1A73E8',
        green:   '#1D9E75',
        amber:   '#BA7517',
        purple:  '#5B2D8E',  // attività di prossimità
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
