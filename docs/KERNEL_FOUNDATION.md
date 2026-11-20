# ASTRA3D Kernel Foundation

This milestone establishes the first native runtime primitives. It is an initial kernel layer, not a finished operating-system kernel or GPU driver.

## Implemented
- Stable process-local entity identifiers and a hierarchical scene database.
- Parent/child ownership with cycle prevention, recursive deletion and deterministic root enumeration.
- Transform component with explicit local-matrix construction.
- Generation-checked resource handles and a typed resource pool, preventing stale handles from resolving after resource deletion.
- Typed synchronous event bus with subscription tokens and unsubscribe.
- Native C++20 build integration and tests.

## Deliberate boundaries
- Scene identifiers are currently process-local monotonic IDs. Persistent UUIDs and versioned project serialization are a later milestone.
- The resource pool is a CPU-side ownership primitive; GPU resources require backend-specific lifetime queues and device synchronization.
- The event bus is synchronous and single-threaded. A lock-free or multi-producer job/event system is not implied.
- Supabase stores project metadata, scene documents, assets metadata, revisions and collaboration state. It is not used as a per-frame geometry or render-data transport.
- Large binary assets should use object storage, while Postgres stores ownership, manifests, references and version metadata.

## Next kernel milestones
1. UUIDs, schema-versioned serialization, scene snapshots and undo transactions.
2. Dependency graph with dirty propagation and evaluated scene state.
3. Job scheduler, cancellation, task dependencies and thread-safe event dispatch.
4. Half-edge mesh topology and geometry operations.
5. GPU device abstraction, resource lifetime tracking and render graph.
6. Native project format and import/export pipeline.
