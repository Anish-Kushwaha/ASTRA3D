-- ASTRA3D persistence schema.
-- Apply only to the dedicated ASTRA3D Supabase project after provisioning.
-- Project-owned storage objects use: <project UUID>/<asset UUID>/<filename>.

create extension if not exists pgcrypto;

create table if not exists public.astra_projects (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (length(name) between 1 and 120),
    description text not null default '',
    engine_version text not null default '0.1.0',
    settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists astra_projects_owner_updated_idx
    on public.astra_projects(owner_id, updated_at desc);

create table if not exists public.astra_project_members (
    project_id uuid not null references public.astra_projects(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
    created_at timestamptz not null default now(),
    primary key (project_id, user_id)
);
create index if not exists astra_project_members_user_idx
    on public.astra_project_members(user_id, project_id);

create table if not exists public.astra_scenes (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.astra_projects(id) on delete cascade,
    name text not null check (length(name) between 1 and 160),
    document_version integer not null default 1 check (document_version > 0),
    scene_document jsonb not null default
        '{"entities":[],"collections":[],"active_camera":null}'::jsonb,
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists astra_scenes_project_updated_idx
    on public.astra_scenes(project_id, updated_at desc);

create table if not exists public.astra_scene_revisions (
    id uuid primary key default gen_random_uuid(),
    scene_id uuid not null references public.astra_scenes(id) on delete cascade,
    revision_number bigint not null check (revision_number > 0),
    scene_document jsonb not null,
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    note text not null default '',
    unique (scene_id, revision_number)
);
create index if not exists astra_scene_revisions_scene_created_idx
    on public.astra_scene_revisions(scene_id, created_at desc);

create table if not exists public.astra_assets (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.astra_projects(id) on delete cascade,
    parent_asset_id uuid references public.astra_assets(id) on delete set null,
    name text not null check (length(name) between 1 and 200),
    asset_type text not null check (asset_type in
        ('mesh', 'material', 'texture', 'image', 'animation', 'armature',
         'audio', 'video', 'cache', 'other')),
    storage_bucket text not null default 'astra-assets'
        check (storage_bucket = 'astra-assets'),
    storage_path text not null,
    content_type text not null default 'application/octet-stream',
    byte_size bigint not null default 0 check (byte_size >= 0),
    checksum_sha256 text,
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid not null references auth.users(id),
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (storage_bucket, storage_path),
    check (storage_path like project_id::text || '/%')
);
create index if not exists astra_assets_project_type_idx
    on public.astra_assets(project_id, asset_type);

create table if not exists public.astra_engine_builds (
    id uuid primary key default gen_random_uuid(),
    version text not null,
    git_commit text not null,
    platform text not null,
    architecture text not null,
    artifact_uri text,
    manifest jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    unique (version, platform, architecture)
);

-- SECURITY DEFINER helpers centralize membership checks and avoid recursive RLS
-- evaluation between astra_projects and astra_project_members.
create or replace function public.astra_can_read_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.astra_projects p
        where p.id = target_project_id
          and p.owner_id = (select auth.uid())
    ) or exists (
        select 1
        from public.astra_project_members m
        where m.project_id = target_project_id
          and m.user_id = (select auth.uid())
    );
$$;

create or replace function public.astra_can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.astra_projects p
        where p.id = target_project_id
          and p.owner_id = (select auth.uid())
    ) or exists (
        select 1
        from public.astra_project_members m
        where m.project_id = target_project_id
          and m.user_id = (select auth.uid())
          and m.role = 'editor'
    );
$$;

create or replace function public.astra_can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.astra_projects p
        where p.id = target_project_id
          and p.owner_id = (select auth.uid())
    );
$$;

create or replace function public.astra_can_read_project_path(project_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.astra_projects p
        where p.id::text = project_path
          and public.astra_can_read_project(p.id)
    );
$$;

create or replace function public.astra_can_edit_project_path(project_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.astra_projects p
        where p.id::text = project_path
          and public.astra_can_edit_project(p.id)
    );
$$;

revoke all on function public.astra_can_read_project(uuid) from public;
revoke all on function public.astra_can_edit_project(uuid) from public;
revoke all on function public.astra_can_manage_project(uuid) from public;
revoke all on function public.astra_can_read_project_path(text) from public;
revoke all on function public.astra_can_edit_project_path(text) from public;
grant execute on function public.astra_can_read_project(uuid) to authenticated;
grant execute on function public.astra_can_edit_project(uuid) to authenticated;
grant execute on function public.astra_can_manage_project(uuid) to authenticated;
grant execute on function public.astra_can_read_project_path(text) to authenticated;
grant execute on function public.astra_can_edit_project_path(text) to authenticated;

create or replace function public.astra_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.astra_assets_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    -- The original author and project identity are immutable after insertion.
    new.id = old.id;
    new.project_id = old.project_id;
    new.created_by = old.created_by;
    new.created_at = old.created_at;
    new.updated_by = (select auth.uid());
    return new;
end;
$$;

drop trigger if exists astra_projects_touch on public.astra_projects;
create trigger astra_projects_touch
    before update on public.astra_projects
    for each row execute function public.astra_touch_updated_at();

drop trigger if exists astra_scenes_touch on public.astra_scenes;
create trigger astra_scenes_touch
    before update on public.astra_scenes
    for each row execute function public.astra_touch_updated_at();

drop trigger if exists astra_assets_touch on public.astra_assets;
create trigger astra_assets_touch
    before update on public.astra_assets
    for each row execute function public.astra_touch_updated_at();

drop trigger if exists astra_assets_guard_update on public.astra_assets;
create trigger astra_assets_guard_update
    before update on public.astra_assets
    for each row execute function public.astra_assets_before_update();

alter table public.astra_projects enable row level security;
alter table public.astra_project_members enable row level security;
alter table public.astra_scenes enable row level security;
alter table public.astra_scene_revisions enable row level security;
alter table public.astra_assets enable row level security;
alter table public.astra_engine_builds enable row level security;

-- Projects
drop policy if exists astra_projects_read on public.astra_projects;
create policy astra_projects_read on public.astra_projects
    for select to authenticated
    using (public.astra_can_read_project(id));

drop policy if exists astra_projects_insert on public.astra_projects;
create policy astra_projects_insert on public.astra_projects
    for insert to authenticated
    with check (owner_id = (select auth.uid()));

drop policy if exists astra_projects_update on public.astra_projects;
create policy astra_projects_update on public.astra_projects
    for update to authenticated
    using (public.astra_can_manage_project(id))
    with check (public.astra_can_manage_project(id));

drop policy if exists astra_projects_delete on public.astra_projects;
create policy astra_projects_delete on public.astra_projects
    for delete to authenticated
    using (public.astra_can_manage_project(id));

-- Membership: project owners may administer members; collaborators can inspect
-- the membership roster but cannot grant themselves additional permissions.
drop policy if exists astra_members_read_self on public.astra_project_members;
drop policy if exists astra_members_read on public.astra_project_members;
create policy astra_members_read on public.astra_project_members
    for select to authenticated
    using (public.astra_can_read_project(project_id));

drop policy if exists astra_members_insert_owner on public.astra_project_members;
create policy astra_members_insert_owner on public.astra_project_members
    for insert to authenticated
    with check (
        public.astra_can_manage_project(project_id)
        and role in ('editor', 'viewer')
    );

drop policy if exists astra_members_update_owner on public.astra_project_members;
create policy astra_members_update_owner on public.astra_project_members
    for update to authenticated
    using (public.astra_can_manage_project(project_id))
    with check (
        public.astra_can_manage_project(project_id)
        and role in ('editor', 'viewer')
    );

drop policy if exists astra_members_delete_owner on public.astra_project_members;
create policy astra_members_delete_owner on public.astra_project_members
    for delete to authenticated
    using (public.astra_can_manage_project(project_id));

-- Scenes
drop policy if exists astra_scenes_read on public.astra_scenes;
create policy astra_scenes_read on public.astra_scenes
    for select to authenticated
    using (public.astra_can_read_project(project_id));

drop policy if exists astra_scenes_insert on public.astra_scenes;
create policy astra_scenes_insert on public.astra_scenes
    for insert to authenticated
    with check (
        created_by = (select auth.uid())
        and public.astra_can_edit_project(project_id)
    );

drop policy if exists astra_scenes_update on public.astra_scenes;
create policy astra_scenes_update on public.astra_scenes
    for update to authenticated
    using (public.astra_can_edit_project(project_id))
    with check (public.astra_can_edit_project(project_id));

drop policy if exists astra_scenes_delete_owner on public.astra_scenes;
create policy astra_scenes_delete_owner on public.astra_scenes
    for delete to authenticated
    using (public.astra_can_manage_project(project_id));

-- Revisions are append-only and readable by anyone who can read the parent scene.
drop policy if exists astra_revisions_read on public.astra_scene_revisions;
create policy astra_revisions_read on public.astra_scene_revisions
    for select to authenticated
    using (
        scene_id in (
            select s.id
            from public.astra_scenes s
            where public.astra_can_read_project(s.project_id)
        )
    );

drop policy if exists astra_revisions_insert on public.astra_scene_revisions;
create policy astra_revisions_insert on public.astra_scene_revisions
    for insert to authenticated
    with check (
        created_by = (select auth.uid())
        and scene_id in (
            select s.id
            from public.astra_scenes s
            where public.astra_can_edit_project(s.project_id)
        )
    );

-- Assets
drop policy if exists astra_assets_read on public.astra_assets;
create policy astra_assets_read on public.astra_assets
    for select to authenticated
    using (public.astra_can_read_project(project_id));

drop policy if exists astra_assets_insert on public.astra_assets;
create policy astra_assets_insert on public.astra_assets
    for insert to authenticated
    with check (
        created_by = (select auth.uid())
        and public.astra_can_edit_project(project_id)
    );

drop policy if exists astra_assets_update on public.astra_assets;
create policy astra_assets_update on public.astra_assets
    for update to authenticated
    using (public.astra_can_edit_project(project_id))
    with check (public.astra_can_edit_project(project_id));

drop policy if exists astra_assets_delete on public.astra_assets;
create policy astra_assets_delete on public.astra_assets
    for delete to authenticated
    using (public.astra_can_edit_project(project_id));

-- Engine build manifests are readable by signed-in users. Writes are reserved
-- for trusted release automation using a server-side service credential.
drop policy if exists astra_engine_builds_read on public.astra_engine_builds;
create policy astra_engine_builds_read on public.astra_engine_builds
    for select to authenticated
    using (true);

-- Supabase Storage bucket is private. Object paths must begin with the owning
-- project UUID, which is checked against the same project membership functions.
insert into storage.buckets (id, name, public)
values ('astra-assets', 'astra-assets', false)
on conflict (id) do update set public = false;

drop policy if exists astra_asset_objects_read on storage.objects;
create policy astra_asset_objects_read on storage.objects
    for select to authenticated
    using (
        bucket_id = 'astra-assets'
        and public.astra_can_read_project_path((storage.foldername(name))[1])
    );

drop policy if exists astra_asset_objects_insert on storage.objects;
create policy astra_asset_objects_insert on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'astra-assets'
        and public.astra_can_edit_project_path((storage.foldername(name))[1])
    );

drop policy if exists astra_asset_objects_update on storage.objects;
create policy astra_asset_objects_update on storage.objects
    for update to authenticated
    using (
        bucket_id = 'astra-assets'
        and public.astra_can_edit_project_path((storage.foldername(name))[1])
    )
    with check (
        bucket_id = 'astra-assets'
        and public.astra_can_edit_project_path((storage.foldername(name))[1])
    );

drop policy if exists astra_asset_objects_delete on storage.objects;
create policy astra_asset_objects_delete on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'astra-assets'
        and public.astra_can_edit_project_path((storage.foldername(name))[1])
    );

-- Explicit Data API grants: new Supabase projects do not automatically expose
-- tables. RLS remains enabled on every user-facing table.
grant select, insert, update, delete on public.astra_projects to authenticated;
grant select, insert, update, delete on public.astra_project_members to authenticated;
grant select, insert, update, delete on public.astra_scenes to authenticated;
grant select, insert on public.astra_scene_revisions to authenticated;
grant select, insert, update, delete on public.astra_assets to authenticated;
grant select on public.astra_engine_builds to authenticated;
