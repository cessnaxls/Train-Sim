# WorldRail Simulator v8 — World Intelligence

An iPad-first railway engineering and 3D driving simulator for GitHub + Render.

## New in v8

### Hardware-aware graphics
The renderer reads browser-exposed CPU thread count, memory hint, pixel ratio, WebGL GPU/renderer string, texture limits and MSAA capability. It then measures real frame time continuously and automatically moves between Performance, Balanced, Quality, High, Ultra and Cinematic tiers to hold the player's selected 30/45/60 FPS target. The tuner controls render scale, shadows, shadow resolution, bloom, SMAA, draw distance and procedural scenery density.

### Real-world building reconstruction
For manageable route extents, the 3D renderer requests OpenStreetMap building footprints from Overpass and procedurally reconstructs them as PBR Three.js structures using real footprint geometry plus `height` / `building:levels` tags when available. Generic scenery remains as a fallback. No building geometry is allowed to intrude within a **10 ft / 3.048 m buffer from the track**; generic procedural buildings are kept farther away as well.

### AI corridor planner
Place a start and destination guide point and press **Auto-design start → destination**. The planner retrieves nearby OpenStreetMap place/population and station data, bends the corridor toward important population centers, creates an engineered guide, generates speed limits, chooses station spacing/names, estimates catchment population and daily riders, and creates a service plan.

### AI system planner
Set a center point (first guide point, or map center), choose a 3–35 km service radius and press **Design entire rail system here**. The planner selects major population corridors with angular separation, creates multiple color-coded lines, stations, speed plans, ridership estimates, peak/off-peak headways, run times and fleet requirements. Lines converge at the network core, providing natural interchange/switch territory. Every generated line has a live service cycle shown in the driving HUD.

### Operations model
Generated schedules include first/last service, peak/off-peak headway, end-to-end run time and required fleet. The live network panel advances service positions for every generated line while the player drives.

## Existing engineering/physics
- Leaflet/OpenStreetMap route editor
- speed-driven curve-radius engineering
- real elevation sampling
- electric/diesel consist engineering
- gross mass/passenger calculations
- adhesion/power-limited tractive effort
- Davis resistance, aero drag and grades
- service/emergency/regenerative braking
- station stopping and overspeed scoring
- Three.js cab/chase/drone cameras
- PBR/clearcoat train materials, atmospheric sky, bloom, SMAA, shadows, vegetation, stations, tunnels, signals and catenary

## Deploy

```bash
npm install
npm run build
```

Publish directory: `dist`

`render.yaml` is included.

## Data notes
WorldRail uses OpenStreetMap/Overpass live data where available. Population coverage varies by region; when a place lacks a population tag the planner uses conservative place-type estimates so generation can still complete. Browser privacy restrictions mean hardware detection is intentionally incomplete on some devices, especially Safari, so measured FPS always overrides the initial hardware guess.
