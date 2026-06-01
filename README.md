# focal-web

Interactive 3D visualization of earthquake **focal mechanisms / moment tensors**, in the browser. A web port of a Blender tool, built with TypeScript + Three.js — fully client-side, no backend.

## Features

- **Focal sphere** ("beachball") with the P/S/SV/SH radiation pattern computed per-fragment in GLSL, plus amplitude contours.
- **Moment-tensor editing** — six component sliders, preset mechanisms, and a live read-out of nodal planes (strike/dip/rake), T/N/P axes, and the ISO/DC/CLVD decomposition.
- **Cut & slip** — the focal sphere and a **fault-block cube** cut along the fault plane and slide apart with slip.
- **Nodal surfaces**, **principal axes**, **fault vectors**, **component dipoles**, and a **compass**.
- **Displacement field** — the deformed radiation surface, and a Fibonacci-placed per-wave vector field (P / S / SV / SH / P+S).
- **Layers panel** with per-element visibility and opacity, plus a global size scale.

## Architecture

Strict layering with one seam:

- `src/core/` — **pure** seismology (no Three.js, no DOM): eigen-decomposition, fault planes, nodal surfaces, moment-tensor decomposition, wave displacement. Unit-tested; a lint rule forbids any rendering/DOM import here.
- `src/render/` — Three.js scene; each visual is a self-contained `FeatureView`.
- `src/state/` — an observable store: `set → derive() → FocalSolution → scene`.
- `src/ui/` — a hand-built control panel.

`derive(tensor)` produces a plain-data `FocalSolution`; the render layer only consumes that.

## Develop

```bash
npm install
npm run dev       # local dev server
npm run test      # vitest (core math)
npm run lint      # eslint, incl. the core/ import-boundary guard
npm run build     # tsc --noEmit && vite build
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
