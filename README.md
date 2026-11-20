# ASTRA3D
**A mathematics-first 3D graphics and rendering engine by ANISH ENTERPRISES.**

ASTRA3D is an independent rendering-engine project built from first principles. The native core is C++20. The web workbench is a companion visual editor and interactive preview, not a replacement for the native renderer.

> Current status: early engineering release. The current CPU pipeline supports triangle rasterization, perspective-correct camera projection, depth testing, wireframe/solid draw modes, basic Lambert shading, procedural mesh generation, and PPM output. It is not yet a production-certified alternative to Blender, Unreal or RenderMan.

## Repository layout
- `engine/` — C++20 renderer library and headless executable
- `tests/` — deterministic unit/integration tests
- `web/` — Vite-based browser workbench and mathematical preview
- `docs/` — architecture, mathematics, formats and roadmap
- `.github/workflows/` — CI builds and tests

## Build native renderer
Requires CMake 3.20+ and a C++20 compiler.

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
ctest --test-dir build --output-on-failure
./build/astra-render --output render.ppm --width 960 --height 640 --scene cube
```

Open `render.ppm` in an image viewer supporting PPM. CLI options are shown by `astra-render --help`.

## Run web workbench
```bash
cd web
npm install
npm run dev
```

## Engineering guarantees
- Explicitly document implemented functionality and limitations.
- No third-party 3D engine in the native rendering path.
- Deterministic CPU rendering for regression testing.
- Keep platform windowing and GPU APIs separate from core math/rasterization.
- Use CI to compile native code and run tests on Linux, Windows and macOS.

## Roadmap
- [x] Foundation: vectors, matrices, camera, mesh, CPU framebuffer
- [x] Triangle rasterization and depth buffer
- [x] Basic Lambert lighting and procedural primitives
- [x] Headless PPM renderer and regression tests
- [x] Browser workbench preview
- [ ] Homogeneous clipping and perspective-correct attributes
- [ ] OBJ/glTF import, texture sampling and material system
- [ ] Real-time window/input backend
- [ ] OpenGL/Vulkan GPU renderer
- [ ] Physically based rendering, shadows and denoising
- [ ] Scene serialization, asset pipeline and plugin SDK

## License
MIT. See [LICENSE](LICENSE).
