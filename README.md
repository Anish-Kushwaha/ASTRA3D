# ASTRA3D
**An independent 3D creation and rendering platform by ANISH ENTERPRISES.**

ASTRA3D is designed as a digital content creation studio with two creation paths over one shared scene model:

1. **Visual Studio** — create and edit 3D scenes through a viewport, primitive tools, object hierarchy, transforms, materials and animation timeline.
2. **Code Studio** — generate 3D geometry and scenes using the ASTRA3D Scene Script API, with live scene construction through the same object and renderer system.

## Current editor foundation
- Custom ASTRA3D WebGL 2 renderer with custom GLSL shaders (not Three.js/Babylon/Unity).
- Interactive orbit/zoom viewport, grid, depth testing and back-face culling.
- Procedural cube, UV sphere, cylinder, torus and plane.
- Scene hierarchy, selection, transform and base-color inspector.
- OBJ triangle mesh import.
- ASTRA3D JSON scene import/export.
- Restricted ASTRA3D script editor that builds primitive scenes without evaluating arbitrary JavaScript.
- Transform keyframes and timeline playback.

The native C++20 CPU renderer is a separate ASTRA3D-owned backend. The web renderer and native renderer are not yet feature-equivalent.

## Build the native renderer
Requires CMake 3.20+ and a C++20 compiler.
```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
ctest --test-dir build --output-on-failure
./build/astra-render --output render.ppm --width 960 --height 640 --scene demo
```

## Run the web editor
```bash
cd web
npm install
npm run dev
```
Open the Vite URL in a WebGL 2 capable browser.

## ASTRA3D Scene Script example
```js
ASTRA3D.clear();
ASTRA3D.cube({ "name": "Body", "position": [0, 0, 0], "scale": [1, 1.5, 0.6], "color": "#5599cc" });
ASTRA3D.sphere({ "name": "Head", "position": [0, 1.65, 0], "scale": [0.65, 0.65, 0.65], "color": "#e8bd91" });
```
The current script mode supports one primitive command per line: cube, sphere, cylinder, torus or plane. It is deliberately not a general JavaScript runtime.

## Blender-derived desktop direction
The long-term desktop strategy is to build ASTRA3D as a clearly branded, license-compliant derivative using Blender's mature application and engine foundations. The upstream import has not yet been performed; review the [Blender-derived product strategy](docs/BLENDER_DERIVATIVE_PLAN.md), especially the GPL-3.0 licensing and separate-repository requirements, before source import.

## Architecture and honest status
Read [Product Architecture](docs/PRODUCT_ARCHITECTURE.md) and [Engine Architecture](docs/ARCHITECTURE.md).

ASTRA3D is an early engineering foundation, not yet a production-complete Blender/Maya replacement. Vertex/edge/face editing, sculpting, UVs, rigging, skinning, advanced animation, physically based materials, shadows, compositing, robust glTF import/export, undo/redo, autosave, plugin SDK and desktop packaging remain future work.

## License
MIT. See [LICENSE](LICENSE).
