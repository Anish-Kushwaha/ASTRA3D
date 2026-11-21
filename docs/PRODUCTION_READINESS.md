# ASTRA3D Production Readiness

**Status: controlled preview / engineering release — not certified production-ready**

This document separates automated release gates from checks that require browsers, devices, operational services or independent review. Passing CI does not substitute for those checks.

## Automated hardening in this release

- Imported OBJ files are limited to 32 MB, 300,000 source vertices and 1,000,000 generated triangles.
- OBJ vertex references, coordinates and face arity are validated; missing/zero/out-of-range indices are rejected.
- Scene documents are bounded to 10,000 objects, 2,000,000 total vertices, 4,000,000 total triangles, 50,000 keyframes and 64 MB of JSON input.
- File imports report read/parse failures; export reports validation failures and delays object-URL revocation.
- Undo history is bounded by entry count and an approximate serialized-memory budget.
- The production host sets a same-origin Content Security Policy, anti-framing and MIME-sniffing headers, a restrictive Permissions Policy, HSTS, and immutable caching for hashed assets.
- The browser app no longer requests Google Fonts at runtime; it uses local system-font fallbacks.
- CI tests supported Node.js LTS lines and runs the test suite, dependency audit and production build.

## Automated release gates

A release candidate must pass all of the following:
1. Run the web production build (unit tests plus Vite production build).
2. Run the web dependency audit at high severity.
3. Build the native C++ code and run CTest.
4. Verify database migration idempotency and schema smoke tests.
5. Verify the Vercel production deployment reaches READY and the production alias points to that deployment.
6. Verify production response headers match the hosting configuration.

## Required manual sign-off before a general-availability claim

- Exercise the production deployment on current Chrome/Edge, Firefox and Safari, including Android and iOS Safari/PWA modes.
- Verify pointer, touch, pinch, keyboard, screen-reader and reduced-motion workflows on physical devices.
- Test WebGL context loss/restoration, low-memory devices, GPU buffer cleanup, very large scenes, browser tab suspension and recovery from storage quota failures.
- Run browser-level end-to-end tests for create/edit/import/export/autosave/undo/redo and verify real exported files open again.
- Perform performance profiling with documented scene-size targets and frame-time budgets on reference devices.
- Complete an independent security review of file parsing, browser storage, hosting headers and any future authentication/persistence endpoints.
- Add a documented backup/recovery procedure and an incident/contact owner for any hosted service.
- Complete accessibility and privacy reviews, plus user-facing terms and privacy documentation for any future account, analytics or cloud features.

## Product scope that is not yet generally available

The browser Studio is not a full Blender/Maya replacement. It does not currently provide production-complete sculpting, UV workflows, rigging/skinning, node materials, compositing, robust glTF round-tripping, plugin SDK, cloud collaboration or remote rendering. The separate Blender-derived desktop companion has its own GPL licensing, packaging and release process.

## Data and service boundaries

The browser Studio currently works locally without an account. Local autosave uses browser storage and is subject to browser quota and user-clearing behavior; users should export important projects to independent backups. No cloud sync, multi-user authorization or server-side project recovery should be promised until that service is provisioned, tested and operated.

## Release decision

The changes in this repository improve input validation, resource bounds and deployment defaults. They do not alone satisfy the manual sign-off checklist above. Until those checks are completed and recorded, describe ASTRA3D as an engineering preview or controlled release, not as certified production software.
