-- ASTRA3D persistence schema. Apply to the dedicated Supabase project after provisioning.
create extension if not exists pgcrypto;

create table if not exists public.astra_projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 120),
 description text not null default '',
 engine_version text not null default '0.1.0',
 settings jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists astra_projects_owner_updated_idx on public.astra_projects(owner_id,updated_at desc);

create table if not exists public.astra_project_members (
 project_id uuid not null references public.astra_projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'editor' check(role in ('owner','editor','viewer')),
 created_at timestamptz not null default now(),
 primary key(project_id,user_id)
);
create index if not exists astra_project_members_user_idx on public.astra_project_members(user_id,project_id);

create table if not exists public.astra_scenes (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.astra_projects(id) on delete cascade,
 name text not null check(length(name) between 1 and 160),
 document_version integer not null default 1 check(document_version>0),
 scene_document jsonb not null default '{"entities":[],"collections":[],"active_camera":null}'::jsonb,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists astra_scenes_project_updated_idx on public.astra_scenes(project_id,updated_at desc);

create table if not exists public.astra_scene_revisions (
 id uuid primary key default gen_random_uuid(),
 scene_id uuid not null references public.astra_scenes(id) on delete cascade,
 revision_number bigint not null check(revision_number>0),
 scene_document jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 note text not null default '',
 unique(scene_id,revision_number)
);
create index if not exists astra_scene_revisions_scene_created_idx on public.astra_scene_revisions(scene_id,created_at desc);

create table if not exists public.astra_assets (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.astra_projects(id) on delete cascade,
 parent_asset_id uuid references public.astra_assets(id) on delete set null,
 name text not null check(length(name) between 1 and 200),
 asset_type text not null check(asset_type in ('mesh','material','texture','image','animation','armature','audio','video','cache','other')),
 storage_bucket text not null default 'astra-assets',
 storage_path text not null,
 content_type text not null default 'application/octet-stream',
 byte_size bigint not null default 0 check(byte_size>=0),
 checksum_sha256 text,
 metadata jsonb not null default '{}'::jsonb,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(storage_bucket,storage_path)
);
create index if not exists astra_assets_project_type_idx on public.astra_assets(project_id,asset_type);

create table if not exists public.astra_engine_builds (
 id uuid primary key default gen_random_uuid(),
 version text not null,
 git_commit text not null,
 platform text not null,
 architecture text not null,
 artifact_uri text,
 manifest jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(version,platform,architecture)
);

create or replace function public.astra_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists astra_projects_touch on public.astra_projects;
create trigger astra_projects_touch before update on public.astra_projects for each row execute function public.astra_touch_updated_at();
drop trigger if exists astra_scenes_touch on public.astra_scenes;
create trigger astra_scenes_touch before update on public.astra_scenes for each row execute function public.astra_touch_updated_at();
drop trigger if exists astra_assets_touch on public.astra_assets;
create trigger astra_assets_touch before update on public.astra_assets for each row execute function public.astra_touch_updated_at();

alter table public.astra_projects enable row level security;
alter table public.astra_project_members enable row level security;
alter table public.astra_scenes enable row level security;
alter table public.astra_scene_revisions enable row level security;
alter table public.astra_assets enable row level security;
alter table public.astra_engine_builds enable row level security;

-- Membership reads are self-only. Project owners administer membership.
create policy "astra_projects_read" on public.astra_projects for select to authenticated
using(owner_id=(select auth.uid()) or id in (select project_id from public.astra_project_members where user_id=(select auth.uid())));
create policy "astra_projects_insert" on public.astra_projects for insert to authenticated
with check(owner_id=(select auth.uid()));
create policy "astra_projects_update" on public.astra_projects for update to authenticated
using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "astra_projects_delete" on public.astra_projects for delete to authenticated
using(owner_id=(select auth.uid()));

create policy "astra_members_read_self" on public.astra_project_members for select to authenticated
using(user_id=(select auth.uid()));
create policy "astra_members_insert_owner" on public.astra_project_members for insert to authenticated
with check(role<>'owner' and project_id in (select id from public.astra_projects where owner_id=(select auth.uid())));
create policy "astra_members_delete_owner" on public.astra_project_members for delete to authenticated
using(project_id in (select id from public.astra_projects where owner_id=(select auth.uid())));

create policy "astra_scenes_read" on public.astra_scenes for select to authenticated
using(project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid())));
create policy "astra_scenes_insert" on public.astra_scenes for insert to authenticated
with check(created_by=(select auth.uid()) and (
 project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or
 project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid()) and role='editor')
));
create policy "astra_scenes_update" on public.astra_scenes for update to authenticated
using(project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid()) and role='editor'))
with check(project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid()) and role='editor'));
create policy "astra_scenes_delete_owner" on public.astra_scenes for delete to authenticated
using(project_id in (select id from public.astra_projects where owner_id=(select auth.uid())));

create policy "astra_revisions_read" on public.astra_scene_revisions for select to authenticated
using(scene_id in (select id from public.astra_scenes));
create policy "astra_revisions_insert" on public.astra_scene_revisions for insert to authenticated
with check(created_by=(select auth.uid()) and scene_id in (select id from public.astra_scenes where
 project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or
 project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid()) and role='editor')
));

create policy "astra_assets_read" on public.astra_assets for select to authenticated
using(project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid())));
create policy "astra_assets_insert" on public.astra_assets for insert to authenticated
with check(created_by=(select auth.uid()) and (
 project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or
 project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid()) and role='editor')
));
create policy "astra_assets_update" on public.astra_assets for update to authenticated
using(project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid()) and role='editor'))
with check(created_by=(select auth.uid()) and (
 project_id in (select id from public.astra_projects where owner_id=(select auth.uid())) or
 project_id in (select project_id from public.astra_project_members where user_id=(select auth.uid()) and role='editor')
));
create policy "astra_assets_delete_owner" on public.astra_assets for delete to authenticated
using(project_id in (select id from public.astra_projects where owner_id=(select auth.uid())));
create policy "astra_engine_builds_read" on public.astra_engine_builds for select to authenticated using(true);

-- New Supabase projects no longer auto-expose public tables. Grant authenticated-only
-- Data API access; every table above remains protected by RLS.
grant select,insert,update,delete on public.astra_projects to authenticated;
grant select,insert,delete on public.astra_project_members to authenticated;
grant select,insert,update,delete on public.astra_scenes to authenticated;
grant select,insert on public.astra_scene_revisions to authenticated;
grant select,insert,update,delete on public.astra_assets to authenticated;
grant select on public.astra_engine_builds to authenticated;
