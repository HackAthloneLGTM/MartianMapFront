# Jezero Planner

A route planner for astronaut EVAs (spacewalks on foot) in Jezero Crater, Mars. Drop two pins on the map, and Jezero Planner finds a route that avoids steep terrain. It also estimates how long the walk takes and the radiation dose along the way.

This repo is the web frontend. The routing, terrain and radiation logic live in [MartianMapBack](https://github.com/HackAthloneLGTM/MartianMapBack).

## Features

- **Interactive terrain map**: slope and elevation layers from NASA's HiRISE terrain model, which you can switch between.
- **Click-to-plan routes**: place pin A and pin B. The route is calculated straight away and drawn on the map.
- **Route panel**: time remaining, one-way time, route length, ascent, descent and radiation dose.
- **Conditions panel**: live radiation rate from Curiosity's RAD instrument, max and mean slope, and route warnings (for example, "Steep section (10-15 degrees)").
- **Impassable routes are rejected**: routes that would cross impassable terrain aren't shown.

## Tech stack

React 19, TypeScript, Vite, [Mantine](https://mantine.dev) and [React Leaflet](https://react-leaflet.js.org).

## Running locally

1. Start the backend (see the MartianMapBack README). By default it serves on `http://localhost:3001`.
2. Start the frontend:

   ```sh
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173`.

In development, Vite forwards `/api/*` requests to the backend on port 3001.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build |
| `npm run lint` | Run ESLint |

## Credits

Terrain data: HiRISE digital terrain model DTEEC_023524_1985_023379_1985_U01 of Jezero Crater, courtesy of NASA/JPL/University of Arizona.

Radiation data: Curiosity Radiation Assessment Detector (RAD) dose rates, courtesy of NASA/JPL-Caltech/SwRI.

## License

MIT, see [LICENSE](LICENSE).
