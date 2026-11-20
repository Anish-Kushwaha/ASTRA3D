# ASTRA3D Kernel Foundation

This milestone establishes a small, native C++20 runtime foundation for the ASTRA3D engine. It is deliberately not described as a finished ECS, production renderer, operating-system kernel, or GPU driver.

## Implemented primitives

### Scene database
- 64-bit, monotonically allocated process-lifetime entity IDs; zero is reserved as invalid.
- Parent/child hierarchy mutations are owned by `SceneDatabase`. Callers can edit names, transforms and active state, but cannot directly rewrite hierarchy links.
- Parent validation and ancestor-cycle prevention during creation/reparenting.
- Iterative subtree deletion, avoiding recursive call-stack growth for deeply nested scenes.
- Deterministic root enumeration.
- Local transform matrices and evaluated world matrices through the ancestor chain.
- `clear()` invalidates current IDs without resetting the allocator, preventing a stale ID from aliasing a newly created entity.

### Resource handles
- Typed CPU resource pool with index/generation handles.
- Reuse of vacant slots while invalidating their previous handles.
- A slot is retired rather than allowing its generation counter to wrap and make an ancient handle valid again.
- The pool does not yet own GPU resources or perform device synchronization.

### Event dispatch
- Typed synchronous event subscriptions with unique 64-bit tokens.
- Unsubscribe and clear operations.
- Dispatch uses a snapshot: listeners added during a publish begin receiving events on the next publish; listeners removed during a publish may still run if already present in that snapshot.
- This event bus is single-threaded and is not a cross-thread messaging primitive.

## Persistence boundary

Supabase is intended for project metadata, scene documents, revision history, asset manifests and collaboration membership. It must not be used as a per-frame geometry transport or render-loop dependency.

Binary assets belong in a private object-storage bucket. Postgres stores references, ownership, checksums, sizes, content types and metadata. The current SQL schema uses a project UUID as the first path segment in the private `astra-assets` bucket and checks that path against project membership.

The database schema is source-controlled but has not yet been applied to a live ASTRA3D Supabase project. Provisioning is currently blocked by the account's two-active-free-project limit; no existing project has been altered.

## Important current limits

- Entity IDs are process-local and are not stable across application restarts. Persistent UUID mapping and schema-versioned serialization remain future work.
- The scene database is not yet a full ECS with independent component storage, archetypes, queries or change tracking.
- World matrices are evaluated on demand; there is no transform cache or dirty propagation yet.
- ResourcePool and EventBus are not thread-safe.
- ResourcePool is a CPU ownership primitive. GPU resources require backend-specific lifetime queues, fences and device synchronization.
- Scene persistence currently uses versioned JSON documents; binary mesh serialization and a formal native project container are not implemented.
- The current native CPU renderer and WebGL renderer are separate backends and are not feature-equivalent.

## Next kernel milestones

1. Persistent entity identity, schema-versioned serialization, scene snapshots and undo/redo transactions.
2. Independent component storage, entity queries and change tracking.
3. Transform/dependency graph with dirty propagation and evaluated scene state.
4. Job scheduler with cancellation, task dependencies, work stealing and explicit thread ownership.
5. Half-edge mesh topology, edit-mode operations and geometry evaluation.
6. GPU device abstraction, resource lifetime tracking, command submission and render graph.
7. Native project container, robust import/export and crash-safe autosave.
