-- GIST 학생회 사업 아카이브 / Supabase SQL Editor에서 최초 1회 실행
-- 주의: 기존 같은 이름의 public 테이블이 없는 새 Supabase 프로젝트에서 실행하세요.
-- 허용 이메일 도메인: @gm.gist.ac.kr, @gist.ac.kr (운영 규칙에 맞게 조정)

create extension if not exists pgcrypto;

-- 인증된 GIST 구성원 검사. 사용자 제공 JWT 값만 믿지 않고 auth.users에서 검증.
create or replace function public.is_gist_member()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and (
        lower(u.email) like '%@gm.gist.ac.kr'
        or lower(u.email) like '%@gist.ac.kr'
      )
  );
$$;

-- 관리자 계정은 SQL Editor에서만 등록/해제. 일반 사용자의 자기 승격 불가.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_gist_member() and exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_gist_member() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_gist_member() to authenticated;
grant execute on function public.is_admin() to authenticated;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  summary text not null check (char_length(summary) between 1 and 240),
  description text not null default '' check (char_length(description) <= 10000),
  category text not null default '기타' check (category in ('교내 행사','대외 행사','학생 복지','시설·환경','제도·정책','기타')),
  owner text not null default '' check (char_length(owner) <= 120),
  start_date date,
  end_date date,
  stage text not null default 'planning' check (stage in ('planning','preparing','executing','finished')),
  status text not null default 'planned' check (status in ('planned','active','paused','done')),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_date_order check (start_date is null or end_date is null or start_date <= end_date)
);
create index projects_updated_idx on public.projects (updated_at desc);
create index projects_status_idx on public.projects (status);

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage text not null check (stage in ('planning','preparing','executing','finished')),
  body text not null check (char_length(body) between 1 and 10000),
  next_action text not null default '' check (char_length(next_action) <= 500),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index updates_project_created_idx on public.project_updates(project_id,created_at desc);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  filename text not null check (char_length(filename) between 1 and 250),
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 10485760),
  mime_type text not null default 'application/octet-stream',
  visible_to_students boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index attachments_project_idx on public.attachments(project_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  actor_id uuid references auth.users(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

-- 관리 기록의 실제 변경 시간은 DB에서 설정
create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger projects_updated_at before update on public.projects
for each row execute function public.touch_updated_at();

-- 코멘트 추가/수정/삭제는 해당 사업의 최근 업데이트 시간도 갱신
create function public.touch_parent_project()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.projects set updated_at = now()
  where id = coalesce(new.project_id, old.project_id);
  return coalesce(new, old);
end;
$$;
create trigger updates_touch_project after insert or update or delete on public.project_updates
for each row execute function public.touch_parent_project();

-- 프로젝트/코멘트/파일 정보 변경 이력, 작성 주체를 임의 입력하지 못하도록 강제
create function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_identifier uuid;
begin
  row_identifier := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_logs(table_name,row_id,action,actor_id,old_data,new_data)
  values (
    tg_table_name, row_identifier, tg_op, (select auth.uid()),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;
create trigger audit_projects after insert or update or delete on public.projects
for each row execute function public.audit_row();
create trigger audit_updates after insert or update or delete on public.project_updates
for each row execute function public.audit_row();
create trigger audit_attachments after insert or update or delete on public.attachments
for each row execute function public.audit_row();

-- 테이블 기본 접근 + 정책 (anon에는 명시적 허용 없음)
alter table public.admins enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.admins, public.projects, public.project_updates, public.attachments, public.audit_logs from anon;
revoke all on public.admins, public.projects, public.project_updates, public.attachments, public.audit_logs from authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.projects, public.project_updates, public.attachments to authenticated;
grant select on public.audit_logs to authenticated;

create policy "admin check own membership" on public.admins
for select to authenticated using (user_id = (select auth.uid()) and (select public.is_gist_member()));

create policy "gist read visible projects" on public.projects
for select to authenticated using ((select public.is_gist_member()) and (is_published or (select public.is_admin())));
create policy "admin create projects" on public.projects
for insert to authenticated with check ((select public.is_admin()));
create policy "admin update projects" on public.projects
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete projects" on public.projects
for delete to authenticated using ((select public.is_admin()));

create policy "gist read visible updates" on public.project_updates
for select to authenticated using (
  (select public.is_gist_member()) and exists (
    select 1 from public.projects p where p.id = project_id
  )
);
create policy "admin insert updates" on public.project_updates
for insert to authenticated with check (
  (select public.is_admin()) and author_id = (select auth.uid())
);
create policy "admin update updates" on public.project_updates
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete updates" on public.project_updates
for delete to authenticated using ((select public.is_admin()));

create policy "gist read allowed attachments" on public.attachments
for select to authenticated using (
  (select public.is_gist_member()) and (
    (select public.is_admin())
    or (visible_to_students and exists (select 1 from public.projects p where p.id = project_id and p.is_published))
  )
);
create policy "admin insert attachments" on public.attachments
for insert to authenticated with check ((select public.is_admin()) and uploaded_by = (select auth.uid()));
create policy "admin update attachments" on public.attachments
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete attachments" on public.attachments
for delete to authenticated using ((select public.is_admin()));

create policy "admin read audits" on public.audit_logs
for select to authenticated using ((select public.is_admin()));

-- Private bucket: 파일명만 알더라도 인가받지 못한 구성원은 원본 조회 불가
insert into storage.buckets (id,name,public,file_size_limit)
values ('project-files','project-files',false,10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

create policy "project files gated read" on storage.objects
for select to authenticated using (
  bucket_id = 'project-files' and (select public.is_gist_member()) and (
    (select public.is_admin())
    or exists (
      select 1 from public.attachments a
      join public.projects p on p.id = a.project_id
      where a.storage_path = name
        and a.visible_to_students = true
        and p.is_published = true
    )
  )
);
create policy "project files admin upload" on storage.objects
for insert to authenticated with check (
  bucket_id = 'project-files' and (select public.is_admin())
);
create policy "project files admin update" on storage.objects
for update to authenticated using (
  bucket_id = 'project-files' and (select public.is_admin())
) with check (bucket_id = 'project-files' and (select public.is_admin()));
create policy "project files admin delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'project-files' and (select public.is_admin())
);

-- 서비스 역할 키(service_role)는 웹사이트에 넣지 마세요.
-- 최초 관리자 지정은 README의 SQL을 별도로 실행하세요.
