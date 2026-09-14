# WorldRail Simulator v6 v5 — Enhanced 3D

An iPad-first railway engineering and driving simulator.

## Visual overhaul

This build replaces the earlier developer-art renderer with a denser Three.js world aimed at an OpenBVE-style simulator presentation:

- procedural ballast, grass, concrete and metal textures
- physically lit rails, sleepers and trackbed
- realistic track gauge proportions
- atmospheric sky, exponential distance fog and ACES tone mapping
- soft dynamic sunlight/shadows
- trackside procedural trees and buildings
- detailed stations with tactile edge strips, canopies, benches, lights and signs
- three-aspect signals
- tunnel shell, structural rings, invert and tunnel lighting
- electric catenary masts and contact wire
- reshaped multi-car train with curved roof profile, doors, windows, bogies, wheels, nose, windshield and headlights
- rebuilt 3D cab with dashboard, displays, pillars, sill and controls
- cab / chase / drone cameras

## Deploy to Render

Build command:

```bash
npm install && npm run build
```

Publish directory:

```text
dist
```

`render.yaml` is included.

## Notes

The world remains procedurally generated so it can work on arbitrary routes anywhere in the world without requiring a handcrafted asset pack for every city. For true Train Sim World-level photorealism, the next step would be streamed geographic/building/terrain datasets plus authored GLTF train/cab assets and PBR texture packs.


## v6 visual overhaul

The renderer now uses Three.js physical sky, ACES tone mapping, post-processing (bloom + SMAA where practical), PBR/clearcoat train materials, denser trackside vegetation, fencing, lineside equipment, distant terrain dressing, improved cab geometry, higher-resolution shadows, and stronger atmospheric depth. This is intended as the highest-quality browser/iPad presentation while retaining procedural route generation.
