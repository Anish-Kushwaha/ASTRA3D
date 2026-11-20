-- ASTRA3D persistence schema. Apply after provisioning the dedicated Supabase project.
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
create index if not exists astra_projects_owner_updated_idx on public.astra_projects(owner_id, updated_at desc);

create table if not exists public.astra_project_members (
  project_id uuid not null references public.astra_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);
create index if not exists astra_project_members_user_idx on public.astra_project_members(user_id, project_id);

create table if not exists public.astra_scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.astra_projects(id) on delete cascade,
  name text not null check (length(name) between 1 and 160),
  document_version integer not null default 1 check (document_version > 0),
  scene_document jsonb not null default '{"entities":[],"collections":[],"active_camera":null}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists astra_scenes_project_updated_idx on public.astra_scenes(project_id, updated_at desc);

create table if not exists public.astra_scene_revisions (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.astra_scenes(id) on delete cascade,
  revision_number bigint not null check (revision_number > 0),
  scene_document jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  note text not null default '',
  unique(scene_id, revision_number)
);
create index if not exists astra_scene_revisions_scene_created_idx on public.astra_scene_revisions(scene_id, created_at desc);

create table if not exists public.astra_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.astra_projects(id) on delete cascade,
  parent_asset_id uuid references public.astra_assets(id) on delete set null,
  name text not null check (length(name) between 1 and 200),
  asset_type text not null check (asset_type in ('mesh','material','texture','image','animation','armature','audio','video','cache','other')),
  storage_bucket text not null default 'astra-assets',
  storage_path text not null,
  content_type text not null default 'application/octet-stream',
  byte_size bigint not null default 0 check (byte_size >= 0),
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);
create index if not exists astra_assets_project_type_idx on public.astra_assets(project_id, asset_type);

create table if not exists public.astra_engine_builds (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  git_commit text not null,
  platform text not null,
  architecture text not null,
  artifact_uri text,
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(version, platform, architecture)
);

create or replace function public.astra_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
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

create policy "project owners and members can read projects" on public.astra_projects for select to authenticated
using (owner_id = (select auth.uid()) or exists (
  select 1 from public.astra_project_members m where m.project_id = id and m.user_id = (select auth.uid())
));
create policy "users create owned projects" on public.astra_projects for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy "owners update projects" on public.astra_projects for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete projects" on public.astra_projects for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "members read membership" on public.astra_project_members for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.astra_projects p where p.id = project_id and p.owner_id = (select auth.uid())
));
create policy "owners add members" on public.astra_project_members for insert to authenticated
with check (exists (select 1 from public.astra_projects p where p.id = project_id and p.owner_id = (select auth.uid())) and role <> 'owner');
create policy "owners remove members" on public.astra_project_members for delete to authenticated
using (exists (select 1 from public.astra_projects p where p.id = project_id and p.owner_id = (select auth.uid())));

create policy "members read scenes" on public.astra_scenes for select to authenticated
using (exists (select 1 from public.astra_projects p where p.id = project_id and (p.owner_id = (select auth.uid()) or exists (
  select 1 from public.astra_project_members m where m.project_id = p.id and m.user_id = (select auth.uid())
))));
create policy "editors create scenes" on public.astra_scenes for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.astra_projects p where p.id = project_id and (
  p.owner_id = (select auth.uid()) or exists (select 1 from public.astra_project_members m where m.project_id = p.id and m.user_id = (select auth.uid()) and m.role = 'editor')
)));
create policy "editors update scenes" on public.astra_scenes for update to authenticated
using (exists (select 1 from public.astra_projects p where p.id = project_id and (
  p.owner_id = (select auth.uid()) or exists (select 1 from public.astra_project_members m where m.project_id = p.id and m.user_id = (select auth.uid()) and m.role = 'editor')
))) with check (exists (select 1 from public.astra_projects p where p.id = project_id and (
  p.owner_id = (select auth.uid()) or exists (select 1 from public.astra_project_members m where m.project_id = p.id and m.user_id = (select auth.uid()) and m.role = 'editor')
)));
create policy "owners delete scenes" on public.astra_scenes for delete to authenticated
using (exists (select 1 from public.astra_projects p where p.id = project_id and p.owner_id = (select auth.uid())));

create policy "members read scene revisions" on public.astra_scene_revisions for select to authenticated
using (exists (select 1 from public.astra_scenes s join public.astra_projects p on p.id=s.project_id where s.id=scene_id and (
  p.owner_id=(select auth.uid()) or exists (select 1 from public.astra_project_members m where m.project_id=p.id and m.user_id=(select auth.uid())
))));
create policy "editors create scene revisions" on public.astra_scene_revisions for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.astra_scenes s join public.astra_projects p on p.id=s.project_id where s.id=scene_id and (
  p.owner_id=(select auth.uid()) or exists (select 1 from public.astra_project_members m where m.project_id=p.id and m.user_id=(select auth.uid()) and m.role='editor')
)));

create policy "members read assets" on public.astra_assets for select to authenticated
using (exists (select 1 from public.astra_projects p where p.id=project_id and (
  p.owner_id=(select auth.uid()) or exists (select 1 from public.astra_project_members m where m.project_id=p.id and m.user_id=(select auth.uid())
)));
create policy "editors manage assets" on public.astra_assets for all to authenticated
using (exists (select 1 from public.astra_projects p where p.id=project_id and (
  p.owner_id=(select auth.uid()) or exists (select 1 from public.astra_project_members m where m.project_id=p.id and m.user_id=(select auth.uid()) and m.role='editor')
))) with check (created_by=(select auth.uid()) and exists (select 1 from public.astra_projects p where p.id=project_id and (
  p.owner_id=(select auth.uid()) or exists (select 1 from public.astra_project_members m where m.project_id=p.id and m.user_id=(select auth.uid()) and m.role='editor')
)));

-- Engine build manifests are public read-only metadata; no client writes.
create policy "authenticated users read engine builds" on public.astra_engine_builds for select to authenticated using (true);

-- Tables are not automatically exposed on current Supabase projects; explicitly grant the minimum
-- client privileges. RLS remains the row-level authorization boundary.
grant select, insert, update, delete on public.astra_projects to authenticated;
grant select, insert, delete on public.astra_project_members to authenticated;
grant select, insert, update, delete on public.astra_scenes to authenticated;
grant select, insert on public.astra_scene_revisions to authenticated;
grant select, insert, update, delete on public.astra_assets to authenticated;
grant select on public.astra_engine_builds to authenticated;
