# WorldRail Asset Edition

A clean-room rebuild of the WorldRail prototype. This edition is deliberately asset-driven.

## What changed
- Scene materials are loaded from a catalog rather than flat colors.
- PBR material slots support diffuse, normal and roughness maps.
- Poly Haven CC0 materials are used at runtime when reachable, with local generated fallback textures only if a network texture fails.
- Rails use an actual rail cross-section.
- Track, ties, platforms, signals, train, buildings and vegetation are constructed through reusable model factories rather than inline scene primitives.
- ACES tone mapping, soft shadows, fog, physical glass and metallic/clearcoat materials.
- Cab/chase/trackside/station cameras and touch controls.
- Leaflet planning screen.
- US-unit HUD.

## Deploy
Render static site:
Build command: `npm install && npm run build`
Publish directory: `dist`

## Asset provenance
Poly Haven assets are CC0. See https://polyhaven.com/license
The app's Asset Catalog lists loaded material families in the planner.

This build is a foundation for importing higher-detail GLB model packs without rewriting the renderer.
