# Around the World in 80 Days — Interactive Web Experience

## Project Overview
An interactive web app tracing Phileas Fogg's journey from Jules Verne's "Around the World in Eighty Days". Built with Vanilla JS, Leaflet.js, and GSAP. Victorian-themed UI with animated map routes, story panels, and a day counter.

## How to Run
```bash
npm run dev       # Start dev server at localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run deploy    # Deploy to Vercel
```

## Tech Stack
- **Bundler**: Vite
- **Map**: Leaflet.js with CartoDB Voyager tiles (no API key needed)
- **Animations**: GSAP + CSS animations
- **Fonts**: Playfair Display + Crimson Text (Google Fonts)
- **Deploy**: Vercel

## File Structure
- `src/main.js` — App entry, initializes all components
- `src/data/journey.json` — All 13 stops with coordinates, days, transport, story events
- `src/components/globe.js` — Leaflet map initialization
- `src/components/route.js` — Animated route line drawing between stops
- `src/components/stops.js` — Stop markers with custom icons
- `src/components/dayCounter.js` — Animated "Day X of 80" counter
- `src/components/storyPanel.js` — Side panel with narrative text
- `src/components/transportIcon.js` — Transport mode indicators
- `src/components/timeline.js` — Bottom timeline scrubber
- `src/utils/animate.js` — Animation helpers (easing, interpolation)
- `src/utils/geo.js` — Geodesic line calculations
- `src/styles/main.css` — Global styles, Victorian theme
- `src/styles/animations.css` — Keyframe animations

## Code Style
- ES modules (import/export)
- No TypeScript — vanilla JS for simplicity
- JSDoc comments only for complex functions
- Descriptive variable names, no abbreviations

## Design Principles
- Victorian aesthetic: dark parchment backgrounds, gold accents, serif typography
- Smooth 60fps animations
- Mobile-responsive (works on phones and tablets)
- All data in journey.json — easy to extend with new stops
- No API keys required — everything is free and open

## Journey Data Format
Each stop in journey.json follows this schema:
```json
{
  "id": 1,
  "name": "London",
  "lat": 51.5074,
  "lng": -0.1278,
  "day": 1,
  "endDay": 1,
  "transport": "start",
  "transportEmoji": "🏛️",
  "description": "Phileas Fogg departs from the Reform Club...",
  "event": "The famous wager of £20,000"
}
```
