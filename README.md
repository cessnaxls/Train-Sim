# WorldRail Simulator

An iPad-first, browser-based railway route designer and physics simulator.

## Features
- Worldwide Leaflet + OpenStreetMap route drawing
- Station placement and naming
- Above-ground and subway modes
- Electric/diesel train engineering
- Real consist mass, passenger capacity, loading, tractive effort, braking and speed limits
- Worldwide terrain sampling through Open-Meteo elevation data
- Physics model using power-limited/adhesion-limited traction, Davis resistance, aerodynamic drag, grade force, service/emergency braking, and regenerative/dynamic braking
- Touch-first power/brake levers for iPad
- Procedural animated cab/track graphics with no proprietary game assets

## Run locally
```bash
npm install
npm run dev
```

## Deploy to Render
This repo includes `render.yaml`. Create a new Render Blueprint or Static Site from the GitHub repo.

Manual settings:
- Build command: `npm ci && npm run build`
- Publish directory: `dist`

## Notes
- OpenStreetMap tiles require attribution and usage consistent with the OSM tile policy.
- Open-Meteo elevation data is based on Copernicus DEM GLO-90. Review attribution/licensing before commercial release.
- The simulator is intended as an engineering game, not certified railway training software.
