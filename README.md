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

## v4 — genuine 3D renderer

WorldRail now uses Three.js/WebGL for the train builder and driving world. The map editor remains Leaflet by design; the engineered centerline it produces is converted into the 3D track you drive.

### 3D systems
- procedural standard-gauge rail geometry following the engineered centerline
- instanced sleepers for iPad performance
- ballast/roadbed and terrain corridor
- subway tunnel tube geometry
- station platforms, canopies and station-name signs
- lineside signals
- overhead catenary poles/wire for surface electric trains
- procedural locomotive/passenger-car consist with wheels, windows, lights and custom livery colors
- live rotating 3D train preview in the engineering screen
- cab, chase and drone cameras while driving
- cab geometry mounted to the first-person camera
- real route elevation applied to the 3D alignment when elevation data is loaded

### Performance
The renderer caps pixel ratio and uses instancing for sleepers to keep the scene practical on iPad Safari. Long routes are resampled before mesh generation.
