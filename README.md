# ASTRA3D

**ASTRA3D by ANISH ENTERPRISES is a browser-first, cross-device 3D creation platform.**

Create and inspect 3D projects directly in a modern browser on phones, tablets, laptops and desktops. The browser Studio is the primary product experience; the Blender-derived ASTRA3D Desktop is an optional high-performance companion for advanced workstation workflows.

## Product editions

### ASTRA3D Studio — browser-first
- Runs directly in a browser; no desktop installation is required for the core editor.
- Responsive interface with touch-friendly scene, viewport, inspector and timeline panels.
- Installable as a Progressive Web App (PWA) where supported.
- Offline shell caching as progressive enhancement; local editing does not require sign-in.
- Custom WebGL 2 renderer and GLSL shaders, not Three.js/Babylon/Unity.
- Visual Studio and restricted Code Studio share the same scene model.
- Local scene files can be exported and reopened without a cloud account.

### ASTRA3D Desktop — optional workstation edition
- Separate Blender-derived desktop product: [Anish-Kushwaha/blender](https://github.com/Anish-Kushwaha/blender).
- Intended for advanced desktop workflows and high-end production use.
- Retains Blender's native project format and upstream engine capabilities.
- Browser Studio and Desktop are companion products, not the same binary or codebase.

## Browser editor foundation

- Interactive WebGL 2 viewport with orbit and zoom.
- Procedural cube, UV sphere, cylinder, torus and plane.
- Scene hierarchy and direct click/tap selection in the 3D viewport.
- Object, Vertex, Edge and Face edit modes with viewport selection and touch-friendly multi-select.
- Vertex translation, polygon face extrusion, convex-face inset, and quad-loop cuts with recalculated mesh normals.
- Polygon face groups are validated and serialized so inset and loop-cut boundaries survive autosave and scene export/import.
- Transform and base-color inspector with validation.
- 100-step undo/redo history and keyboard shortcuts (Ctrl/Cmd+Z, Shift+Z, Y).
- Local browser autosave and recovery, independent of cloud sign-in.
- Versioned ASTRA3D Scene JSON v2 with bounded geometry validation and animation keyframe round-tripping.
- OBJ triangle-mesh import.
- ASTRA3D JSON scene import/export.
- Restricted ASTRA3D script editor that builds primitive scenes without evaluating arbitrary JavaScript.
- Transform keyframes and timeline playback.
- Responsive mobile/tablet panel dock, pointer/touch interactions and PWA install support.

## Device strategy

| Device | Experience |
|---|---|
| Phone | Browser editor with focused viewport, touch navigation and bottom-dock panels for scene, inspection and timeline |
| Tablet | Browser editor with larger touch workspace and collapsible editing panels |
| Laptop / desktop | Full browser workbench with sidebars and timeline |
| Workstation desktop | Optional ASTRA3D Desktop for high-complexity production |

A compatible WebGL 2 browser and sufficient device memory are currently required for the 3D viewport. Performance and feature availability vary by device. WebGPU is a future progressive rendering backend, not a current requirement.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open the Vite URL in a WebGL 2 capable browser.

## Native C++ renderer

The native C++20 CPU renderer is a separate ASTRA3D-owned backend. It is not the browser runtime and is not yet feature-equivalent to the browser renderer.

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
ctest --test-dir build --output-on-failure
./build/astra-render --output render.ppm --width 960 --height 640 --scene demo
```

## Cross-device project interoperability

- **ASTRA3D Scene JSON** is the current lightweight browser-native scene format.
- **glTF 2.0 / GLB** is the planned interchange format for geometry, materials and supported animation between browser and desktop.
- **.blend** remains the native Blender-derived desktop project format and is not currently opened directly by the browser editor.
- Cloud sync, collaborative editing and remote rendering are future opt-in services; core browser editing must remain useful without them.

See [Product Architecture](docs/PRODUCT_ARCHITECTURE.md), [Cross-device Architecture](docs/CROSS_DEVICE_ARCHITECTURE.md), [Engine Architecture](docs/ARCHITECTURE.md) and [Blender-derived product strategy](docs/BLENDER_DERIVATIVE_PLAN.md).

## Current status

ASTRA3D is an early engineering foundation, not yet a production-complete Blender/Maya replacement. Advanced proportional editing, bevels, non-manifold repair, arbitrary n-gon triangulation, sculpting, UVs, rigging, skinning, advanced animation, physically based materials, shadows, compositing, robust glTF import/export, plugin SDK, cloud sync and desktop packaging remain future work. Current inset supports convex polygon faces; Loop Cut follows connected quad-face loops.

## License

The browser/native ASTRA3D platform in this repository is MIT. The separate Blender-derived desktop fork is governed by Blender's GPL-3.0 and file-level compatible licenses. Do not merge the desktop derivative into this MIT repository.
