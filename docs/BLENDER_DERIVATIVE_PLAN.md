# ASTRA3D — Blender-Derived Product Strategy

**Owner / product:** ANISH ENTERPRISES  
**Product:** ASTRA3D  
**Upstream project:** Blender  
**Upstream repository:** https://github.com/blender/blender  
**Status:** Architecture decision and import plan. No Blender source files have been copied into this repository yet.

## Executive decision

ASTRA3D should use Blender's mature desktop 3D application and engine as its upstream technical foundation, then develop an ASTRA3D product identity and differentiated workflows on top.

This is a derivative-product strategy, not a claim that the current small ASTRA3D C++ prototype can be transformed into Blender by renaming files. Blender is a large, multi-platform C/C++ and Python application with a substantial build system, dependency tree, tests, bundled scripts, resources and platform-specific code.

The intended outcome is an independently branded ASTRA3D distribution that preserves upstream attribution and license obligations, maintains a clear path for upstream security and bug fixes, and carries ASTRA3D-specific features as a controlled patch series.

## Important licensing gate

The current ASTRA3D repository is licensed MIT. Blender states that the application as a whole is GPL-3.0, while individual files may use other compatible licenses.

If Blender GPL-covered code is copied into or combined as one derivative work with ASTRA3D, the resulting combined derivative must comply with GPL-3.0. The current MIT license cannot simply be used as the license for that combined derivative. This affects redistribution of source, binaries, modifications, notices, and downstream distribution terms.

Before importing Blender source into the existing ASTRA3D repository, the project owner must approve the relicensing of the combined product to GPL-3.0. A safer repository boundary is to keep the existing MIT-licensed ASTRA3D web companion and prototype clearly separate from a new GPL-3.0 ASTRA3D desktop distribution repository, with any cross-repository integration reviewed for derivative-work implications.

Do not remove Blender copyright notices, AUTHORS entries, per-file SPDX/license headers, third-party notices, or license files. Do not use Blender Foundation trademarks, logos, or official product artwork as ASTRA3D branding. ASTRA3D must have its own name, logo, artwork, splash screen and product copy.

## Product identity and differentiation

### Brand
- Product name: ASTRA3D
- Publisher: ANISH ENTERPRISES
- Visual direction: professional graphite/charcoal workspace, restrained orange accent, high-contrast readable panels.
- Product identity: ASTRA3D, not a misleadingly renamed official Blender distribution.
- Preserve required upstream legal notices and clearly identify the product as a modified derivative.

### ASTRA3D product layer
Build differentiating features as isolated modules, add-ons, Python packages, UI workspace definitions and carefully scoped native patches where needed:
- ASTRA3D startup workspace and default editor layout.
- ASTRA3D project manager and project templates.
- ASTRA3D scene scripting and Code Studio workflow.
- ASTRA3D asset library, metadata and project collaboration integration.
- Optional cloud account/sync integration; core editing must continue offline.
- Enterprise deployment, policy, diagnostics and update channels.
- ASTRA3D-specific import/export presets and production templates.
- Optional AI-assisted workflows behind explicit user control.
- Native project format compatibility and robust interchange with standard formats.

Do not fork or rewrite mature geometry, dependency graph, animation, rendering, file I/O or editor systems until there is a demonstrated requirement. Prefer upstream APIs and extension points.

## Upstream subsystems to adopt and evaluate

| Capability | Upstream area to evaluate | ASTRA3D adaptation |
|---|---|---|
| Application shell and windowing | `source/blender/windowmanager`, `source/blender/editors` | ASTRA3D workspace, menus, startup and branding |
| Data model and scene graph | `source/blender/blenkernel`, `source/blender/makesdna`, `source/blender/makesrna` | Map ASTRA3D project/scene metadata without breaking native data |
| Geometry and mesh editing | `source/blender/blenkernel`, `source/blender/editors/mesh`, `source/blender/bmesh` | Modeling and topology toolset |
| Dependency evaluation | `source/blender/depsgraph` | Evaluated scene, animation and dependency scheduling |
| Viewport and GPU | `source/blender/gpu`, `source/blender/draw`, `source/blender/editors/space_view3d` | Viewport presentation and custom ASTRA3D overlays |
| Rendering | `source/blender/render`, `intern/cycles`, `source/blender/draw` | Render engines and ASTRA3D render presets |
| Animation and rigging | `source/blender/animrig`, `source/blender/ikplugin`, animation-related editor modules | Timeline, keyframes, rigging and animation tools |
| Python extensibility | `source/blender/python`, `scripts`, `scripts/addons_core` | ASTRA3D extension and automation packages |
| File formats | `source/blender/io` and format-specific modules | Interoperability, import/export presets |
| Tests | `tests`, module-specific test suites | Regression coverage for ASTRA3D changes |

The list is a subsystem map for investigation, not a guarantee that every directory or API is stable or suitable for external embedding.

## Repository and source strategy

Preferred structure after licensing approval:

1. Keep `Anish-Kushwaha/ASTRA3D` as the product integration/control repository and web companion.
2. Create a separate, dedicated ASTRA3D desktop source repository based on the official Blender repository, preserving upstream Git history and all upstream files.
3. Preserve an `upstream` remote pointing to the canonical Blender repository and record the exact upstream commit used for each ASTRA3D release.
4. Maintain ASTRA3D modifications as small, reviewable commits or patches on a clearly named ASTRA3D branch.
5. Keep dependency repositories and platform libraries in their upstream-supported arrangement. Do not commit downloaded build artifacts or platform SDK binaries unnecessarily.
6. Keep the web companion, Supabase schema and Vercel deployment independent of the desktop build. Supabase stores account/project metadata and collaboration data; it is not a render-loop dependency or a replacement for native project files.

A full Git import must be performed with Git itself, not by copying files through the GitHub contents API. The official GitHub mirror documents the Git LFS-safe initial clone command. The repository and its dependency checkouts are large; use a machine with sufficient storage, memory, network bandwidth and a supported native toolchain.

## Import procedure after licensing approval

Use a new repository so the existing ASTRA3D prototype, MIT license and Vercel deployment are not silently overwritten.

Example source acquisition (run on a capable development machine):

```bash
git clone --filter=blob:none --no-checkout \
  https://github.com/blender/blender.git ASTRA3D-Desktop
cd ASTRA3D-Desktop
git remote rename origin upstream
git remote add origin https://github.com/Anish-Kushwaha/ASTRA3D-Desktop.git
git checkout main
```

For a GitHub mirror clone that triggers Git LFS smudge problems, follow the upstream instructions and use `GIT_LFS_SKIP_SMUDGE=1` for the initial clone. Follow Blender's current official clone/update/build documentation for the exact branch and dependency setup; do not assume a generic recursive submodule update is sufficient.

Before first branded build:
- Record upstream commit and branch.
- Audit all licenses and bundled third-party dependencies.
- Preserve upstream notices and attribution.
- Create a separate ASTRA3D branding asset set.
- Build an unmodified upstream baseline first.
- Add ASTRA3D changes in isolated increments and run the relevant test suites after each increment.

## Build and release approach

The full desktop application is built using Blender's own supported build system and dependency setup, not the small CMake project at the root of the current ASTRA3D prototype.

Release gates:
1. Clean upstream baseline builds on supported target platforms.
2. ASTRA3D branding and startup workspace changes build and pass tests.
3. Import/export, scene loading and saving remain compatible.
4. Render and viewport regression tests pass.
5. Security and dependency/license audits pass.
6. Reproducible release artifacts and source corresponding to each binary are published.
7. GPL-3.0 and third-party notices accompany every redistributed derivative build.

## Current repository status

- Existing ASTRA3D C++ kernel and WebGL editor remain the current prototype.
- The existing MIT license remains unchanged until the owner explicitly approves the licensing/repository boundary.
- Blender source has not been imported, copied, renamed or modified in this repository.
- No Blender-derived desktop binary has been built.
- No claim is made that ASTRA3D currently has Blender's features.

## Primary upstream references

- Source: https://github.com/blender/blender
- Official build handbook: https://developer.blender.org/docs/handbook/building_blender/
- Git clone/update handbook: https://developer.blender.org/docs/handbook/contributing/using_git/clone_update/
- Blender license: https://www.blender.org/about/license/
