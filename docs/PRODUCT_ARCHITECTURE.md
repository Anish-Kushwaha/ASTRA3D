# ASTRA3D Product Architecture

ASTRA3D is an independent 3D creation and rendering platform. Its two authoring modes share one scene and asset model.

## Visual Studio
- Scene hierarchy and object selection.
- Procedural primitive creation: cube, sphere, cylinder, torus and plane.
- Transform inspector: position, rotation, scale and base color.
- Interactive perspective viewport with orbit, zoom and grid.
- Wavefront OBJ triangle-mesh import.
- ASTRA3D JSON scene import/export.
- Transform keyframes and timeline playback with interpolation.

## Code Studio
- ASTRA3D Scene Script editor.
- Declarative geometry API for primitive generation.
- Code-built scenes use the same object, mesh and renderer path as visually-created scenes.
- The parser accepts a constrained command grammar and does not execute arbitrary uploaded JavaScript.

## Rendering architecture
The browser workbench uses a custom ASTRA3D WebGL 2 renderer: custom GLSL shaders, scene objects, model/view/projection transforms, depth testing, back-face culling, grid drawing and draw submission. It uses WebGL 2 as a low-level GPU API, not an embedded third-party 3D engine.

The native C++20 renderer remains a separate headless CPU backend. Both are ASTRA3D-owned implementations. A shared scene schema and native/web feature parity are future engineering milestones.

## Current milestone boundaries
This is an early editor foundation, not yet a complete digital-content-creation application. Missing major capabilities include topology editing (vertex/edge/face), sculpting, UV unwrapping, texture painting, armature/bone rigging, inverse kinematics, skin weights, node-based materials, physically based rendering, shadows, compositing, audio sync, robust production import/export, undo/redo, autosave, plugin SDK and a native desktop application.

## Security
Never execute uploaded source code with eval, Function, unrestricted dynamic imports or ambient privileges. The current script parser accepts only a limited ASTRA3D command grammar. Future user scripting should run in a sandboxed runtime with capability-based APIs, resource limits and explicit file/network permissions.
