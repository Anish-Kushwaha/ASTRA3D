# ASTRA3D Cross-device Product Architecture

**Principle:** ASTRA3D is browser-first. The browser Studio is the primary way to create, review and share 3D projects. A Blender-derived desktop edition is an optional high-performance companion, not a prerequisite.

## Product editions

### ASTRA3D Studio (primary)
Runs directly in modern mobile and desktop browsers. It is progressively enhanced as an installable Progressive Web App (PWA), but installation is optional.

- Phone: quick modeling, basic transforms, scene inspection, small edits, review and sharing.
- Tablet: touch-first scene editing with collapsible scene, inspector and timeline panels.
- Laptop/desktop browser: full editor layout and larger workspaces.
- Offline: cache the application shell and allow local projects to be opened/exported. Cloud sync is not required for local editing.
- Rendering: browser GPU backend. WebGL 2 is the current baseline; WebGPU is a planned optional backend after capability and compatibility testing.

### ASTRA3D Desktop (optional)
The Blender-derived desktop fork provides the workstation path for advanced production workflows, native .blend projects, and features that are too expensive or unsupported in a browser environment. It must not be required for browser Studio use.

## Architecture boundaries

The browser and desktop applications are separate codebases and runtimes. Do not attempt to load the full Blender desktop UI in a browser or imply that the Blender fork is already WebAssembly-compatible.

- Browser client: ASTRA3D-owned WebGL 2 engine and responsive editor.
- Desktop client: Blender-derived application with ASTRA3D-specific changes isolated into templates/extensions and carefully reviewed core patches.
- Shared contracts: versioned ASTRA3D scene document and glTF 2.0 / GLB interchange.
- Optional services: project sync, access control, asset storage, collaboration and remote rendering. The editor must remain useful when these services are offline.

## Project interoperability

### Current format
The browser editor currently exports an ASTRA3D JSON scene containing primitive and imported mesh data, transforms and base colors. It is a prototype format; schema evolution and validation are required before promising long-term compatibility.

### Target format strategy
- .astra.json: versioned ASTRA3D document for browser-native editing, scene metadata, editor state and ASTRA3D-specific features.
- .glb / .gltf: standards-based exchange for meshes, hierarchy, materials, textures and supported animation.
- .blend: native desktop authoring file. It remains desktop-native and is not promised to open directly in the browser.

Import/export should preserve supported fields and report unsupported data rather than silently discard it. A conversion round-trip test suite is required.

## Browser capability tiers

1. **Baseline:** WebGL 2, pointer/touch input, local file open/save and responsive UI.
2. **Enhanced:** WebGPU when available, higher precision rendering paths, worker-based geometry processing and larger scene budgets.
3. **Cloud-assisted:** optional remote rendering, asset sync and collaboration. Must be explicit, secure and metered.

Feature detection must drive capability messaging. Do not rely on user-agent strings to assume a device's GPU capabilities. Avoid promising that every device can render every scene; memory, browser GPU limits and thermal constraints differ.

## Data and security

- Local browser projects remain user-controlled.
- Validate all imported JSON, OBJ and future glTF data; bound file sizes, vertex counts, nesting depth and decompression work.
- Never execute uploaded project scripts with eval, Function or unrestricted dynamic imports.
- Cloud storage uses per-project authorization and private object storage. Do not embed service-role keys in browser code.
- Collaboration should use a server-authorized protocol; untrusted clients cannot assert project roles.
- Offline caches contain app code and public shell assets only, never private project or authentication responses.

## Roadmap

### Browser-first essentials
- [x] Responsive tablet/phone editor panel dock.
- [x] PWA manifest, app icon, install prompt and application-shell service worker.
- [x] Preserve local-first scene editing and export path.
- [ ] Test touch gestures, file pickers and PWA install on real Android/iOS devices.
- [ ] Add a capability panel for WebGL 2 limits, memory and WebGPU availability.
- [x] Add 100-step undo/redo history and keyboard shortcuts.
- [x] Add local browser autosave and recovery using validated scene snapshots.
- [x] Add versioned scene document v2 with v1 migration and bounded geometry validation.
- [x] Add direct viewport object picking for click/tap selection.
- [ ] Make phone workflows context-aware, with simplified tool panels.

### Shared project layer
- [ ] Publish a JSON Schema for .astra.json.
- [ ] Add migration support between document versions.
- [ ] Add robust glTF 2.0/GLB import/export, including texture/material tests.
- [ ] Add desktop conversion tooling for .blend ↔ glTF/GLB where the data is representable.
- [ ] Add cross-platform round-trip conformance tests.

### Optional cloud
- [ ] Project sync and versioned backups.
- [ ] Private asset storage and signed downloads.
- [ ] Collaboration and presence.
- [ ] Optional render queue on server GPUs.

### Desktop companion
- [ ] Apply ASTRA3D theme, icon and splash with original artwork.
- [ ] Ship platform builds and update channels.
- [ ] Maintain patches against Blender upstream.
- [ ] Preserve Blender license and third-party notices.

## Current limitations

The browser editor remains an early WebGL 2 prototype. It now includes primitive modeling, transforms, OBJ import, viewport picking, simple keyframes, local undo/redo and autosave, but is not feature-equivalent to Blender. The current responsive/PWA layer is an initial implementation and still requires browser/device testing. The desktop fork has an initial Python application template but no validated ASTRA3D desktop build yet.
