-- Integration smoke test for the ASTRA3D RLS and storage policies.
-- Run as the database owner against the local PostgreSQL test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id) values
    ('11111111-1111-4111-8111-111111111111'),
    ('22222222-2222-4222-8222-222222222222'),
    ('33333333-3333-4333-8333-333333333333')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub',
                  '11111111-1111-4111-8111-111111111111', true);

insert into public.astra_projects (id, owner_id, name)
values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Owner project'
);

insert into public.astra_project_members (project_id, user_id, role)
values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     '22222222-2222-4222-8222-222222222222', 'editor'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     '33333333-3333-4333-8333-333333333333', 'viewer');

insert into public.astra_scenes (id, project_id, name, created_by)
values (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Main scene',
    '11111111-1111-4111-8111-111111111111'
);

insert into public.astra_scene_revisions
    (id, scene_id, revision_number, scene_document, created_by, note)
values (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    1,
    '{"entities":[]}'::jsonb,
    '11111111-1111-4111-8111-111111111111',
    'Initial revision'
);

insert into public.astra_assets
    (id, project_id, name, asset_type, storage_path, created_by)
values (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Test mesh',
    'mesh',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/mesh.glb',
    '11111111-1111-4111-8111-111111111111'
);

insert into storage.objects (bucket_id, name)
values (
    'astra-assets',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/mesh.glb'
);

-- A collaborator who owns another project must not gain access to this project
-- merely because they can edit it as a member.
select set_config('request.jwt.claim.sub',
                  '22222222-2222-4222-8222-222222222222', true);
insert into public.astra_projects (id, owner_id, name)
values (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Second user project'
);

do $$
declare
    changed_rows integer;
begin
    if (select count(*) from public.astra_projects
        where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1 then
        raise exception 'Editor could not read shared project';
    end if;

    if (select count(*) from public.astra_scenes
        where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then
        raise exception 'Editor could not read shared scene';
    end if;

    update public.astra_scenes
       set name = 'Edited by collaborator'
     where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then
        raise exception 'Editor could not update a scene';
    end if;

    update public.astra_assets
       set name = 'Edited mesh'
     where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then
        raise exception 'Editor could not update asset metadata';
    end if;

    if (select created_by from public.astra_assets
        where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
        <> '11111111-1111-4111-8111-111111111111'::uuid then
        raise exception 'Asset creator identity was not preserved';
    end if;

    if (select updated_by from public.astra_assets
        where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
        <> '22222222-2222-4222-8222-222222222222'::uuid then
        raise exception 'Asset updater identity was not recorded';
    end if;

    if (select count(*) from public.astra_projects
        where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 1 then
        raise exception 'Owner could not read their own second project';
    end if;
end;
$$;

-- Viewer can read shared data but cannot write scene, asset or object data.
select set_config('request.jwt.claim.sub',
                  '33333333-3333-4333-8333-333333333333', true);

do $$
declare
    changed_rows integer;
begin
    if (select count(*) from public.astra_project_members
        where project_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 2 then
        raise exception 'Viewer cannot read the collaborator roster';
    end if;

    if (select count(*) from public.astra_projects
        where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 0 then
        raise exception 'Cross-project data isolation failed';
    end if;

    if (select count(*) from storage.objects
        where bucket_id = 'astra-assets'
          and name like 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/%') <> 1 then
        raise exception 'Viewer could not read shared asset object';
    end if;

    update public.astra_assets
       set name = 'Unauthorized edit'
     where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    get diagnostics changed_rows = row_count;
    if changed_rows <> 0 then
        raise exception 'Viewer unexpectedly updated asset metadata';
    end if;

    begin
        insert into public.astra_scenes (project_id, name, created_by)
        values (
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            'Unauthorized scene',
            '33333333-3333-4333-8333-333333333333'
        );
        raise exception 'Viewer unexpectedly inserted a scene';
    exception
        when insufficient_privilege then null;
    end;

    begin
        insert into storage.objects (bucket_id, name)
        values (
            'astra-assets',
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/viewer-upload/model.glb'
        );
        raise exception 'Viewer unexpectedly uploaded an object';
    exception
        when insufficient_privilege then null;
    end;
end;
$$;

rollback;
