# ASTRA3D Product Architecture

ASTRA3D is a browser-first, cross-device 3D creation platform by ANISH ENTERPRISES. ASTRA3D Studio in the browser is the primary product. ASTRA3D Desktop, maintained as a separate Blender-derived fork, is an optional workstation companion.

## Browser Studio

The browser Studio is designed to run directly in modern browsers on phones, tablets, laptops and desktop computers. Users do not need to install a native desktop application to access the core browser editor.

### Responsive workflows
- Desktop browsers: full workbench with scene hierarchy, viewport, inspector and timeline.
- Tablets and phones: dedicated bottom dock to open the scene/create panel, return to the viewport, inspect object properties and open the timeline.
- Pointer and touch: single-pointer orbit, wheel zoom, and two-pointer pinch-to-zoom.
- PWA: install prompt and application-shell caching where browser support permits.
- Local-first: local scene creation and file export do not require a login or cloud connection.

The responsive/PWA implementation is an initial milestone. Real-device testing is still required on current Android and iOS browsers.

## Visual Studio
- Scene hierarchy and direct click/tap selection in the 3D viewport.
- Local undo/redo history and autosave recovery.
- Procedural primitive creation: cube, sphere, cylinder, torus and plane.
- Transform inspector: position, rotation, scale and base color.
- Interactive perspective viewport with orbit, zoom and grid.
- Wavefront OBJ triangle-mesh import.
- Versioned ASTRA3D Scene JSON v2 import/export, with v1 migration and geometry validation.
- Transform keyframes and timeline playback with interpolation.

## Code Studio
- ASTRA3D Scene Script editor.
- Declarative geometry API for primitive generation.
- Code-built scenes use the same object, mesh and renderer path as visually-created scenes.
- The parser accepts a constrained command grammar and does not execute arbitrary uploaded JavaScript.

## Rendering architecture
The browser workbench uses an ASTRA3D-owned WebGL 2 renderer with custom GLSL shaders, scene objects, model/view/projection transforms, depth testing, back-face culling, grid drawing and draw submission. WebGPU is a planned optional backend and is not the current baseline.

The native C++20 CPU renderer remains a separate ASTRA3D-owned backend; it is not currently the browser runtime and is not feature-equivalent.

## Desktop companion
The optional desktop edition is based on Blender and lives in a separate GPL-3.0 repository: https://github.com/Anish-Kushwaha/blender. It is intended for workflows that benefit from a full workstation application and the upstream Blender engine. Native .blend files remain desktop-native and are not currently opened directly by the browser editor.

## Cross-device project formats
- Current browser format: ASTRA3D JSON scene prototype with object geometry, transforms and base colors.
- Target browser-native format: versioned .astra.json document with schema validation, migrations and transform-keyframe round-tripping.
- Target interchange: glTF 2.0 / GLB for supported geometry, hierarchy, materials, textures and animation.
- Desktop-native format: .blend. Conversion between .blend and glTF/GLB is limited to data representable in the interchange format.

Do not silently discard unsupported data during import/export. Add round-trip conformance tests before promising compatibility.

## Optional cloud services
Project sync, private asset storage, collaboration, team access controls and remote GPU rendering are future opt-in services. Core local browser editing must remain useful without them. Never embed service-role credentials in browser code.

## Current milestone boundaries
This is an early editor foundation, not yet a complete digital-content-creation application. Major missing capabilities include topology editing (vertex/edge/face), sculpting, UV unwrapping, texture painting, armature/bone rigging, inverse kinematics, skin weights, node-based materials, physically based rendering, shadows, compositing, audio sync, robust production import/export, plugin SDK and validated cross-device project conversion.

## Security
Never execute uploaded source code with eval, Function, unrestricted dynamic imports or ambient privileges. The current script parser accepts only a limited ASTRA3D command grammar. Validate imported scene files and bound file size, vertex count, nesting depth and decompression work. Future user scripting should run in a sandboxed runtime with capability-based APIs, resource limits and explicit file/network permissions.
