create extension if not exists "uuid-ossp";

-- helper: orgs the current user belongs to
create or replace function auth.current_user_orgs()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.memberships where user_id = auth.uid();
$$;

-- enable RLS on org-scoped tables
alter table organizations  enable row level security;
alter table memberships    enable row level security;
alter table subscriptions  enable row level security;
alter table usage_events   enable row level security;
alter table searches       enable row level security;
alter table apify_runs     enable row level security;
alter table leads          enable row level security;
alter table activities     enable row level security;

-- org-scoped read/write policy
create policy org_rw on organizations
  using   (id in (select auth.current_user_orgs()))
  with check (id in (select auth.current_user_orgs()));

create policy org_rw on memberships
  using   (org_id in (select auth.current_user_orgs()))
  with check (org_id in (select auth.current_user_orgs()));

create policy org_rw on subscriptions
  using   (org_id in (select auth.current_user_orgs()))
  with check (org_id in (select auth.current_user_orgs()));

create policy org_rw on usage_events
  using   (org_id in (select auth.current_user_orgs()))
  with check (org_id in (select auth.current_user_orgs()));

create policy org_rw on searches
  using   (org_id in (select auth.current_user_orgs()))
  with check (org_id in (select auth.current_user_orgs()));

create policy org_rw on apify_runs
  using   (org_id in (select auth.current_user_orgs()))
  with check (org_id in (select auth.current_user_orgs()));

create policy org_rw on leads
  using   (org_id in (select auth.current_user_orgs()))
  with check (org_id in (select auth.current_user_orgs()));

create policy org_rw on activities
  using   (org_id in (select auth.current_user_orgs()))
  with check (org_id in (select auth.current_user_orgs()));

-- memberships: a user sees only their own membership rows
create policy own_memberships on memberships
  using (user_id = auth.uid());

-- global cache tables: RLS enabled, NO client policy → service-role only
alter table businesses        enable row level security;
alter table business_seo      enable row level security;
alter table social_profiles   enable row level security;
alter table opportunity_scores enable row level security;

-- search_businesses join table
alter table search_businesses enable row level security;
create policy org_rw on search_businesses
  using   (search_id in (select id from public.searches where org_id in (select auth.current_user_orgs())))
  with check (search_id in (select id from public.searches where org_id in (select auth.current_user_orgs())));
