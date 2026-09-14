-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text default 'recruiter',
  avatar_url text,
  phone text,
  company text,
  department text,
  timezone text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. JOBS
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  department text,
  description text,
  status text default 'active' check (status in ('active', 'closed', 'draft')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. CANDIDATES
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  current_job_title text,
  total_experience numeric default 0,
  education text,
  status text not null default 'pending_review' 
    check (status in ('applied', 'screening', 'shortlisted', 'rejected', 'pending_review', 'interview', 'hired')),
  match_score numeric default 0 check (match_score >= 0 and match_score <= 100),
  resume_score numeric default 0 check (resume_score >= 0 and resume_score <= 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. RESUMES
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  extracted_text text,
  processing_status text default 'uploaded' check (processing_status in ('uploaded', 'processing', 'analyzed', 'failed')),
  uploaded_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. CANDIDATE SKILLS
create table if not exists public.candidate_skills (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  skill_type text default 'technical',
  created_at timestamptz default now()
);

-- 7. CANDIDATE ACTIVITIES
create table if not exists public.candidate_activities (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete cascade,
  activity_type text not null,
  activity_message text,
  created_at timestamptz default now()
);

-- 8. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.resumes enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.candidate_activities enable row level security;

-- Policies for Profiles
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Policies for Recruiters (Jobs, Candidates, Resumes, Skills, Activities)
create policy "Recruiters access own jobs" on public.jobs for all using (auth.uid() = recruiter_id);
create policy "Recruiters access own candidates" on public.candidates for all using (auth.uid() = recruiter_id);
create policy "Recruiters access own resumes" on public.resumes for all using (auth.uid() = recruiter_id);
create policy "Recruiters access own skills" on public.candidate_skills for all using (auth.uid() = recruiter_id);
create policy "Recruiters access own activities" on public.candidate_activities for all using (auth.uid() = recruiter_id);

-- 9. TRIGGERS

-- A. Auto-create Profile on Sign Up
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- B. Auto-log Candidate Status Changes
create or replace function public.log_candidate_status_change() returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.candidate_activities (recruiter_id, candidate_id, activity_type, activity_message)
    values (
      new.recruiter_id, 
      new.id, 
      'status_changed', 
      'Candidate status changed from ' || old.status || ' to ' || new.status
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_candidate_status_update on public.candidates;
create trigger on_candidate_status_update
  after update on public.candidates
  for each row execute procedure public.log_candidate_status_change();

-- 10. DASHBOARD RPC
create or replace function public.get_dashboard_stats()
returns json
language plpgsql
security definer
as $$
declare
  _uid uuid := auth.uid();
  _total_resumes int;
  _shortlisted int;
  _pending int;
  _rejected int;
  _applied int;
  _interview int;
  _hired int;
  _screening int;
begin
  -- Basic Counts
  select count(*) into _total_resumes from public.resumes where recruiter_id = _uid;
  select count(*) into _shortlisted from public.candidates where recruiter_id = _uid and status = 'shortlisted';
  select count(*) into _pending from public.candidates where recruiter_id = _uid and status = 'pending_review';
  select count(*) into _rejected from public.candidates where recruiter_id = _uid and status = 'rejected';
  
  -- Pipeline Counts
  select count(*) into _applied from public.candidates where recruiter_id = _uid and status = 'applied';
  select count(*) into _screening from public.candidates where recruiter_id = _uid and status = 'screening';
  select count(*) into _interview from public.candidates where recruiter_id = _uid and status = 'interview';
  select count(*) into _hired from public.candidates where recruiter_id = _uid and status = 'hired';

  return json_build_object(
    'totalResumes', coalesce(_total_resumes, 0),
    'shortlisted', coalesce(_shortlisted, 0),
    'pendingReview', coalesce(_pending, 0),
    'rejected', coalesce(_rejected, 0),
    'pipeline', json_build_object(
      'applied', coalesce(_applied, 0),
      'screening', coalesce(_screening, 0),
      'shortlisted', coalesce(_shortlisted, 0),
      'interview', coalesce(_interview, 0),
      'hired', coalesce(_hired, 0)
    )
  );
end;
$$;

-- 11. COMPLETE DASHBOARD OVERVIEW RPC
create or replace function public.get_dashboard_overview()
returns json
language plpgsql
security definer
as $$
declare
  _uid uuid := auth.uid();
  _user_profile json;
  _stats json;
  _pipeline json;
  _recent_activity json;
  _top_skills json;
  _candidates_by_status json;
  _weekly_trend json;
  _top_candidates json;
  
  _total_resumes int := 0;
  _shortlisted int := 0;
  _pending int := 0;
  _rejected int := 0;
  _applied int := 0;
  _screening int := 0;
  _interview int := 0;
  _hired int := 0;
begin
  if _uid is null then
    return json_build_object(
      'authenticated', false,
      'user', null,
      'stats', json_build_object('totalResumes', 0, 'shortlisted', 0, 'pendingReview', 0, 'rejected', 0),
      'pipeline', json_build_object('applied', 0, 'screening', 0, 'shortlisted', 0, 'interview', 0, 'hired', 0),
      'recentActivity', '[]'::json,
      'topSkills', '[]'::json,
      'candidatesByStatus', '[]'::json,
      'weeklyResumeTrend', '[]'::json,
      'topCandidates', '[]'::json
    );
  end if;

  -- 1. User Profile
  select json_build_object(
    'id', p.id,
    'full_name', coalesce(p.full_name, split_part(p.email, '@', 1)),
    'email', p.email,
    'role', p.role,
    'avatar_url', p.avatar_url
  ) into _user_profile
  from public.profiles p
  where p.id = _uid;

  -- 2. KPI Counts
  select count(*) into _total_resumes from public.resumes where recruiter_id = _uid;
  select count(*) into _shortlisted from public.candidates where recruiter_id = _uid and status = 'shortlisted';
  select count(*) into _pending from public.candidates where recruiter_id = _uid and status = 'pending_review';
  select count(*) into _rejected from public.candidates where recruiter_id = _uid and status = 'rejected';

  -- 3. Pipeline Stages
  select count(*) into _applied from public.candidates where recruiter_id = _uid and status = 'applied';
  select count(*) into _screening from public.candidates where recruiter_id = _uid and status = 'screening';
  select count(*) into _interview from public.candidates where recruiter_id = _uid and status = 'interview';
  select count(*) into _hired from public.candidates where recruiter_id = _uid and status = 'hired';

  _stats := json_build_object(
    'totalResumes', coalesce(_total_resumes, 0),
    'shortlisted', coalesce(_shortlisted, 0),
    'pendingReview', coalesce(_pending, 0),
    'rejected', coalesce(_rejected, 0)
  );

  _pipeline := json_build_object(
    'applied', coalesce(_applied, 0),
    'screening', coalesce(_screening, 0),
    'shortlisted', coalesce(_shortlisted, 0),
    'interview', coalesce(_interview, 0),
    'hired', coalesce(_hired, 0)
  );

  -- 4. Recent Activities (latest 5)
  select coalesce(json_agg(t), '[]'::json) into _recent_activity from (
    select 
      ca.id,
      ca.activity_type,
      ca.activity_message,
      ca.created_at,
      coalesce(r.file_name, c.full_name || '.pdf', 'Resume.pdf') as file_name,
      coalesce(c.full_name, 'Unknown') as candidate_name,
      coalesce(c.status, 'applied') as candidate_status
    from public.candidate_activities ca
    left join public.candidates c on ca.candidate_id = c.id
    left join public.resumes r on ca.resume_id = r.id
    where ca.recruiter_id = _uid
    order by ca.created_at desc
    limit 5
  ) t;

  -- 5. Top Skills
  select coalesce(json_agg(s), '[]'::json) into _top_skills from (
    select 
      cs.skill_name as name,
      count(*) as count,
      round((count(*)::numeric / greatest((select count(*) from public.candidates where recruiter_id = _uid), 1)) * 100) as pct
    from public.candidate_skills cs
    join public.candidates c on cs.candidate_id = c.id
    where c.recruiter_id = _uid
    group by cs.skill_name
    order by count desc
    limit 6
  ) s;

  -- 6. Candidates by Status
  _candidates_by_status := json_build_array(
    json_build_object('name', 'Shortlisted', 'value', coalesce(_shortlisted, 0), 'fill', '#0984e3'),
    json_build_object('name', 'Pending Review', 'value', coalesce(_pending, 0), 'fill', '#fdcb6e'),
    json_build_object('name', 'Rejected', 'value', coalesce(_rejected, 0), 'fill', '#e17055')
  );

  -- 7. Weekly Resume Trend
  select coalesce(json_agg(w), '[]'::json) into _weekly_trend from (
    with days as (
      select (current_date - i)::date as d
      from generate_series(6, 0, -1) as i
    )
    select 
      to_char(days.d, 'Dy') as day,
      days.d::text as date,
      coalesce(count(r.id), 0)::int as resumes
    from days
    left join public.resumes r on r.recruiter_id = _uid and date(r.uploaded_at) = days.d
    group by days.d
    order by days.d asc
  ) w;

  -- 8. Top Candidates
  select coalesce(json_agg(tc), '[]'::json) into _top_candidates from (
    select 
      c.id,
      c.full_name as name,
      coalesce(c.current_job_title, 'Candidate') as role,
      coalesce(c.match_score, 0)::text || '%' as score,
      c.status,
      case 
        when c.status = 'shortlisted' then 'badge-green'
        when c.status in ('pending_review', 'screening') then 'badge-yellow'
        when c.status = 'rejected' then 'badge-red'
        else 'badge-blue'
      end as status_class
    from public.candidates c
    where c.recruiter_id = _uid
    order by c.match_score desc, c.created_at desc
    limit 5
  ) tc;

  return json_build_object(
    'authenticated', true,
    'user', _user_profile,
    'stats', _stats,
    'pipeline', _pipeline,
    'recentActivity', _recent_activity,
    'topSkills', _top_skills,
    'candidatesByStatus', _candidates_by_status,
    'weeklyResumeTrend', _weekly_trend,
    'topCandidates', _top_candidates
  );
end;
$$;

-- 12. OPTIONAL RECRUITER DEMO DATA SEED (DEVELOPMENT ONLY)
create or replace function public.seed_recruiter_demo_data()
returns json
language plpgsql
security definer
as $$
declare
  _uid uuid := auth.uid();
  _job_id uuid;
  _cand_id uuid;
  _res_id uuid;
begin
  if _uid is null then
    raise exception 'Must be logged in to seed demo data';
  end if;

  -- Ensure recruiter has a profile
  insert into public.profiles (id, full_name, email, role)
  select _uid, 'Admin Recruiter', 'admin@example.com', 'recruiter'
  where not exists (select 1 from public.profiles where id = _uid);

  -- Only seed if the recruiter currently has 0 candidates
  if exists (select 1 from public.candidates where recruiter_id = _uid) then
    return json_build_object('success', false, 'message', 'Recruiter already has candidates, skipping seed.');
  end if;

  -- Create a sample job
  insert into public.jobs (recruiter_id, title, department, description, status)
  values (_uid, 'Senior Full Stack Engineer', 'Engineering', 'Sample engineering role for demo purposes', 'active')
  returning id into _job_id;

  -- Candidate 1: Rahul Sharma (Shortlisted, 85%)
  insert into public.candidates (recruiter_id, job_id, full_name, email, phone, current_job_title, total_experience, education, status, match_score, resume_score)
  values (_uid, _job_id, 'Rahul Sharma', 'rahul.sharma@example.com', '+91 98765 43210', 'Python Developer', 4.5, 'B.Tech in Computer Science', 'shortlisted', 85, 88)
  returning id into _cand_id;

  insert into public.resumes (candidate_id, recruiter_id, file_name, file_path, file_type, file_size, processing_status, uploaded_at)
  values (_cand_id, _uid, 'Rahul_Sharma.pdf', 'resumes/rahul_sharma.pdf', 'application/pdf', 1240000, 'analyzed', now() - interval '2 minutes')
  returning id into _res_id;

  insert into public.candidate_skills (candidate_id, recruiter_id, skill_name, skill_type)
  values 
    (_cand_id, _uid, 'Python', 'technical'),
    (_cand_id, _uid, 'Machine Learning', 'technical'),
    (_cand_id, _uid, 'SQL', 'technical'),
    (_cand_id, _uid, 'Data Analysis', 'technical');

  insert into public.candidate_activities (recruiter_id, candidate_id, resume_id, activity_type, activity_message, created_at)
  values (_uid, _cand_id, _res_id, 'resume_analyzed', 'Resume analyzed with 85% match score', now() - interval '2 minutes');

  -- Candidate 2: Priya Verma (Shortlisted, 78%)
  insert into public.candidates (recruiter_id, job_id, full_name, email, phone, current_job_title, total_experience, education, status, match_score, resume_score)
  values (_uid, _job_id, 'Priya Verma', 'priya.verma@example.com', '+91 98765 43211', 'Data Analyst', 3.0, 'B.Sc in Statistics', 'shortlisted', 78, 80)
  returning id into _cand_id;

  insert into public.resumes (candidate_id, recruiter_id, file_name, file_path, file_type, file_size, processing_status, uploaded_at)
  values (_cand_id, _uid, 'Priya_Verma.pdf', 'resumes/priya_verma.pdf', 'application/pdf', 1150000, 'analyzed', now() - interval '15 minutes')
  returning id into _res_id;

  insert into public.candidate_skills (candidate_id, recruiter_id, skill_name, skill_type)
  values 
    (_cand_id, _uid, 'Python', 'technical'),
    (_cand_id, _uid, 'SQL', 'technical'),
    (_cand_id, _uid, 'Data Analysis', 'technical'),
    (_cand_id, _uid, 'Communication', 'soft_skill');

  insert into public.candidate_activities (recruiter_id, candidate_id, resume_id, activity_type, activity_message, created_at)
  values (_uid, _cand_id, _res_id, 'resume_analyzed', 'Resume analyzed with 78% match score', now() - interval '15 minutes');

  -- Candidate 3: Amit Kumar (Shortlisted, 72%)
  insert into public.candidates (recruiter_id, job_id, full_name, email, phone, current_job_title, total_experience, education, status, match_score, resume_score)
  values (_uid, _job_id, 'Amit Kumar', 'amit.kumar@example.com', '+91 98765 43212', 'ML Engineer', 3.5, 'M.Tech in AI', 'shortlisted', 72, 75)
  returning id into _cand_id;

  insert into public.resumes (candidate_id, recruiter_id, file_name, file_path, file_type, file_size, processing_status, uploaded_at)
  values (_cand_id, _uid, 'Amit_Kumar.pdf', 'resumes/amit_kumar.pdf', 'application/pdf', 1024000, 'analyzed', now() - interval '30 minutes')
  returning id into _res_id;

  insert into public.candidate_skills (candidate_id, recruiter_id, skill_name, skill_type)
  values 
    (_cand_id, _uid, 'Machine Learning', 'technical'),
    (_cand_id, _uid, 'Python', 'technical'),
    (_cand_id, _uid, 'Problem Solving', 'soft_skill');

  insert into public.candidate_activities (recruiter_id, candidate_id, resume_id, activity_type, activity_message, created_at)
  values (_uid, _cand_id, _res_id, 'candidate_shortlisted', 'Candidate shortlisted for interview', now() - interval '30 minutes');

  -- Candidate 4: Neha Singh (Pending Review, 65%)
  insert into public.candidates (recruiter_id, job_id, full_name, email, phone, current_job_title, total_experience, education, status, match_score, resume_score)
  values (_uid, _job_id, 'Neha Singh', 'neha.singh@example.com', '+91 98765 43213', 'Python Developer', 2.0, 'B.E in Information Technology', 'pending_review', 65, 68)
  returning id into _cand_id;

  insert into public.resumes (candidate_id, recruiter_id, file_name, file_path, file_type, file_size, processing_status, uploaded_at)
  values (_cand_id, _uid, 'Neha_Singh.pdf', 'resumes/neha_singh.pdf', 'application/pdf', 1300000, 'processing', now() - interval '1 hour')
  returning id into _res_id;

  insert into public.candidate_skills (candidate_id, recruiter_id, skill_name, skill_type)
  values 
    (_cand_id, _uid, 'Python', 'technical'),
    (_cand_id, _uid, 'Communication', 'soft_skill');

  insert into public.candidate_activities (recruiter_id, candidate_id, resume_id, activity_type, activity_message, created_at)
  values (_uid, _cand_id, _res_id, 'resume_uploaded', 'New resume uploaded - pending review', now() - interval '1 hour');

  -- Candidate 5: Rohit Das (Rejected, 58%)
  insert into public.candidates (recruiter_id, job_id, full_name, email, phone, current_job_title, total_experience, education, status, match_score, resume_score)
  values (_uid, _job_id, 'Rohit Das', 'rohit.das@example.com', '+91 98765 43214', 'Data Analyst', 1.5, 'BCA', 'rejected', 58, 55)
  returning id into _cand_id;

  insert into public.resumes (candidate_id, recruiter_id, file_name, file_path, file_type, file_size, processing_status, uploaded_at)
  values (_cand_id, _uid, 'Rohit_Das.pdf', 'resumes/rohit_das.pdf', 'application/pdf', 980000, 'analyzed', now() - interval '2 hours')
  returning id into _res_id;

  insert into public.candidate_skills (candidate_id, recruiter_id, skill_name, skill_type)
  values 
    (_cand_id, _uid, 'SQL', 'technical'),
    (_cand_id, _uid, 'Problem Solving', 'soft_skill');

  insert into public.candidate_activities (recruiter_id, candidate_id, resume_id, activity_type, activity_message, created_at)
  values (_uid, _cand_id, _res_id, 'candidate_rejected', 'Candidate did not meet core requirements', now() - interval '2 hours');

  return json_build_object('success', true, 'message', 'Sample demo data seeded successfully for current recruiter.');
end;
$$;

-- ============================================================================
-- 13. SCREEN 2: UPLOAD RESUME & AI RESUME ANALYSIS FOUNDATION
-- ============================================================================

-- A. Resumes extensions
alter table public.resumes add column if not exists file_hash text;
alter table public.resumes add column if not exists error_message text;

-- B. Jobs extensions
alter table public.jobs add column if not exists required_skills jsonb default '[]'::jsonb;
alter table public.jobs add column if not exists optional_skills jsonb default '[]'::jsonb;
alter table public.jobs add column if not exists mandatory_requirements jsonb default '[]'::jsonb;
alter table public.jobs add column if not exists optional_requirements jsonb default '[]'::jsonb;

-- C. Job Requirements table
create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  requirement_text text not null,
  requirement_type text not null check (requirement_type in ('skill', 'experience', 'education', 'certification', 'other')),
  is_mandatory boolean default true,
  created_at timestamptz default now()
);
alter table public.job_requirements enable row level security;
drop policy if exists "Recruiters access own job_requirements" on public.job_requirements;
create policy "Recruiters access own job_requirements" on public.job_requirements for all using (auth.uid() = recruiter_id);

-- D. Job Resumes table (many-to-many relationship allowing 1 resume to match multiple jobs)
create table if not exists public.job_resumes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  match_score numeric default 0 check (match_score >= 0 and match_score <= 100),
  status text default 'applied' check (status in ('applied', 'screening', 'pending_review', 'shortlisted', 'interview', 'rejected', 'hired')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_job_resume unique(job_id, resume_id)
);
alter table public.job_resumes enable row level security;
drop policy if exists "Recruiters access own job_resumes" on public.job_resumes;
create policy "Recruiters access own job_resumes" on public.job_resumes for all using (auth.uid() = recruiter_id);

-- E. Resume Analysis table (resume-specific parsed data)
create table if not exists public.resume_analysis (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  candidate_name text,
  email text,
  phone text,
  education jsonb default '[]'::jsonb,
  skills jsonb default '[]'::jsonb,
  experience jsonb default '[]'::jsonb,
  projects jsonb default '[]'::jsonb,
  certifications jsonb default '[]'::jsonb,
  resume_score numeric default 0 check (resume_score >= 0 and resume_score <= 100),
  resume_quality text default 'normal' check (resume_quality in ('normal', 'good', 'amazing', 'excellent')),
  raw_analysis jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_resume_analysis unique(resume_id)
);
alter table public.resume_analysis enable row level security;
drop policy if exists "Recruiters access own resume_analysis" on public.resume_analysis;
create policy "Recruiters access own resume_analysis" on public.resume_analysis for all using (auth.uid() = recruiter_id);

-- F. Resume Skill Matches table
create table if not exists public.resume_skill_matches (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  match_status text not null check (match_status in ('matching', 'missing', 'extra')),
  created_at timestamptz default now()
);
alter table public.resume_skill_matches enable row level security;
drop policy if exists "Recruiters access own resume_skill_matches" on public.resume_skill_matches;
create policy "Recruiters access own resume_skill_matches" on public.resume_skill_matches for all using (auth.uid() = recruiter_id);

-- G. Resume Job Analysis table (job-specific match outcome)
create table if not exists public.resume_job_analysis (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  match_score numeric default 0 check (match_score >= 0 and match_score <= 100),
  skill_match_percentage numeric default 0 check (skill_match_percentage >= 0 and skill_match_percentage <= 100),
  matching_skills jsonb default '[]'::jsonb,
  missing_skills jsonb default '[]'::jsonb,
  extra_skills jsonb default '[]'::jsonb,
  strengths jsonb default '[]'::jsonb,
  improvement_suggestions jsonb default '[]'::jsonb,
  mandatory_requirements_met jsonb default '[]'::jsonb,
  optional_requirements_met jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_resume_job_analysis unique(resume_id, job_id)
);
alter table public.resume_job_analysis enable row level security;
drop policy if exists "Recruiters access own resume_job_analysis" on public.resume_job_analysis;
create policy "Recruiters access own resume_job_analysis" on public.resume_job_analysis for all using (auth.uid() = recruiter_id);

-- H. Storage bucket for resumes (private, 10MB max, PDF & DOCX)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 
  'resumes', 
  false, 
  10485760, 
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

-- Storage RLS policies for private recruiter-scoped storage: resumes/{auth.uid()}/...
drop policy if exists "Recruiters upload own resumes" on storage.objects;
create policy "Recruiters upload own resumes" on storage.objects
  for insert with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Recruiters view own resumes" on storage.objects;
create policy "Recruiters view own resumes" on storage.objects
  for select using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Recruiters update own resumes" on storage.objects;
create policy "Recruiters update own resumes" on storage.objects
  for update using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Recruiters delete own resumes" on storage.objects;
create policy "Recruiters delete own resumes" on storage.objects
  for delete using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 14. SCREEN 4: ADVANCED ANALYSIS, RECRUITER DECISION & COMPANY FIT
-- ============================================================================

-- A. Benchmark Companies (Reference data for role fit estimation)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  industry text,
  location text,
  is_benchmark boolean default true,
  metadata jsonb default '{"description": "Benchmark reference criteria for role fit estimation"}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.companies enable row level security;
drop policy if exists "Authenticated users read companies" on public.companies;
create policy "Authenticated users read companies" on public.companies
  for select using (auth.role() = 'authenticated');

-- B. Company Benchmark Jobs
create table if not exists public.company_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_title text not null,
  department text,
  description text,
  experience_min numeric default 0,
  experience_max numeric,
  education_requirements text,
  is_benchmark boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.company_jobs enable row level security;
drop policy if exists "Authenticated users read company_jobs" on public.company_jobs;
create policy "Authenticated users read company_jobs" on public.company_jobs
  for select using (auth.role() = 'authenticated');

-- C. Company Job Criteria (Weighted criteria for transparent fit calculation)
create table if not exists public.company_job_criteria (
  id uuid primary key default gen_random_uuid(),
  company_job_id uuid not null references public.company_jobs(id) on delete cascade,
  criterion_type text not null check (criterion_type in ('skill', 'experience', 'education', 'certification', 'other')),
  criterion_name text not null,
  criterion_value text,
  is_required boolean default true,
  weight numeric default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.company_job_criteria enable row level security;
drop policy if exists "Authenticated users read criteria" on public.company_job_criteria;
create policy "Authenticated users read criteria" on public.company_job_criteria
  for select using (auth.role() = 'authenticated');

-- D. Resume Company Matches (Estimated Resume Fit)
create table if not exists public.resume_company_matches (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  company_job_id uuid not null references public.company_jobs(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  fit_score numeric default 0 check (fit_score >= 0 and fit_score <= 100),
  matching_skills jsonb default '[]'::jsonb,
  missing_skills jsonb default '[]'::jsonb,
  matched_requirements jsonb default '[]'::jsonb,
  missing_requirements jsonb default '[]'::jsonb,
  explanation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_resume_company_match unique(resume_id, company_job_id, recruiter_id)
);
alter table public.resume_company_matches enable row level security;
drop policy if exists "Recruiters access own resume_company_matches" on public.resume_company_matches;
create policy "Recruiters access own resume_company_matches" on public.resume_company_matches
  for all using (auth.uid() = recruiter_id);

-- E. Candidate Review Decisions (Human Recruiter Final Decision)
create table if not exists public.candidate_review_decisions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  decision text not null check (decision in ('shortlisted', 'rejected', 'review')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_candidate_review_decision unique(resume_id, job_id, recruiter_id)
);
alter table public.candidate_review_decisions enable row level security;
drop policy if exists "Recruiters access own review decisions" on public.candidate_review_decisions;
create policy "Recruiters access own review decisions" on public.candidate_review_decisions
  for all using (auth.uid() = recruiter_id);

-- F. Extend resume_job_analysis with match_band, decision_recommendation, score_breakdown, and summaries
alter table public.resume_job_analysis
  add column if not exists match_band text check (match_band in ('strong_match', 'moderate_match', 'low_match')),
  add column if not exists decision_recommendation text check (decision_recommendation in ('shortlist_recommended', 'reject_recommended')),
  add column if not exists ai_recommendation text,
  add column if not exists recommendation_summary text,
  add column if not exists recommendation_reason text,
  add column if not exists recommendation_factors jsonb default '[]'::jsonb,
  add column if not exists analysis_summary text,
  add column if not exists score_breakdown jsonb default '{}'::jsonb,
  add column if not exists screening_decision text check (screening_decision in ('shortlisted', 'rejected')),
  add column if not exists screening_explanation text;

-- ============================================================================
-- 15. SCREEN 6: ATS COMPATIBILITY CHECK
-- ============================================================================

-- A. ATS Reports Table
create table if not exists public.ats_reports (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_id uuid null references public.jobs(id) on delete set null,
  candidate_id uuid null references public.candidates(id) on delete set null,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  ats_score integer not null default 0 check (ats_score >= 0 and ats_score <= 100),
  ats_status text not null check (ats_status in ('ats_friendly', 'needs_improvement', 'poor_compatibility')),
  passed_count integer not null default 0,
  warning_count integer not null default 0,
  failed_count integer not null default 0,
  overall_summary text,
  recommendations jsonb default '[]'::jsonb,
  analysis_version text default 'ats_v1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists unique_ats_report_with_job 
  on public.ats_reports (resume_id, job_id) 
  where job_id is not null;

create unique index if not exists unique_ats_report_without_job 
  on public.ats_reports (resume_id) 
  where job_id is null;

create index if not exists idx_ats_reports_recruiter_id on public.ats_reports(recruiter_id);
create index if not exists idx_ats_reports_resume_id on public.ats_reports(resume_id);
create index if not exists idx_ats_reports_job_id on public.ats_reports(job_id);

alter table public.ats_reports enable row level security;
drop policy if exists "Recruiters access own ats_reports" on public.ats_reports;
create policy "Recruiters access own ats_reports" on public.ats_reports
  for all using (auth.uid() = recruiter_id);

-- B. ATS Check Results Table
create table if not exists public.ats_check_results (
  id uuid primary key default gen_random_uuid(),
  ats_report_id uuid not null references public.ats_reports(id) on delete cascade,
  check_type text not null,
  title text not null,
  status text not null check (status in ('pass', 'warn', 'fail')),
  score integer not null default 0,
  max_score integer not null default 0,
  description text,
  details jsonb default '{}'::jsonb,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_ats_check_results_report_id on public.ats_check_results(ats_report_id);

alter table public.ats_check_results enable row level security;
drop policy if exists "Recruiters access own ats_check_results" on public.ats_check_results;
create policy "Recruiters access own ats_check_results" on public.ats_check_results
  for all using (
    exists (
      select 1 from public.ats_reports r
      where r.id = ats_report_id and r.recruiter_id = auth.uid()
    )
  );

-- C. Secure Server-Side Deterministic Analysis Function
create or replace function public.run_ats_check(
  p_resume_id uuid,
  p_job_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recruiter_id uuid := auth.uid();
  v_resume record;
  v_analysis record;
  v_job record;
  v_job_analysis record;
  v_candidate record;
  
  v_score_format int := 0;
  v_desc_format text := '';
  v_status_format text := 'fail';
  
  v_score_parse int := 0;
  v_desc_parse text := '';
  v_status_parse text := 'fail';
  
  v_score_contact int := 0;
  v_desc_contact text := '';
  v_status_contact text := 'fail';
  
  v_score_keywords int := 0;
  v_desc_keywords text := '';
  v_status_keywords text := 'fail';
  v_title_keywords text := 'Keyword Density';
  v_details_keywords jsonb := '{}'::jsonb;
  
  v_score_headers int := 0;
  v_desc_headers text := '';
  v_status_headers text := 'fail';
  
  v_score_font int := 0;
  v_desc_font text := '';
  v_status_font text := 'pass';
  
  v_score_skills int := 0;
  v_desc_skills text := '';
  v_status_skills text := 'fail';
  
  v_score_exp int := 0;
  v_desc_exp text := '';
  v_status_exp text := 'fail';
  
  v_score_edu int := 0;
  v_desc_edu text := '';
  v_status_edu text := 'fail';
  
  v_total_score int := 0;
  v_ats_status text := 'poor_compatibility';
  v_passed_count int := 0;
  v_warning_count int := 0;
  v_failed_count int := 0;
  
  v_recs jsonb := '[]'::jsonb;
  v_report_id uuid;
  v_existing_report_id uuid;
  v_result json;
  
  v_ext text;
  v_text_len int := 0;
  v_has_name boolean := false;
  v_has_email boolean := false;
  v_has_phone boolean := false;
  v_skill_count int := 0;
  v_exp_count int := 0;
  v_edu_count int := 0;
  v_header_count int := 0;
begin
  if v_recruiter_id is null then
    raise exception 'Unauthorized: User not authenticated' using errcode = '42501';
  end if;

  select * into v_resume 
  from public.resumes 
  where id = p_resume_id and recruiter_id = v_recruiter_id;
  
  if not found then
    raise exception 'Resume not found or access denied' using errcode = 'P0002';
  end if;

  if p_job_id is not null then
    select * into v_job 
    from public.jobs 
    where id = p_job_id and recruiter_id = v_recruiter_id;
    
    if not found then
      raise exception 'Job not found or access denied' using errcode = 'P0002';
    end if;
  end if;

  select * into v_analysis 
  from public.resume_analysis 
  where resume_id = p_resume_id;

  if v_resume.candidate_id is not null then
    select * into v_candidate 
    from public.candidates 
    where id = v_resume.candidate_id;
  end if;

  if p_job_id is not null then
    select * into v_job_analysis 
    from public.resume_job_analysis 
    where resume_id = p_resume_id and job_id = p_job_id;
  end if;

  -- 1. File Format (Max 10 pts)
  v_ext := lower(split_part(v_resume.file_name, '.', array_length(string_to_array(v_resume.file_name, '.'), 1)));
  if v_ext in ('pdf', 'docx') then
    if v_resume.file_size is not null and v_resume.file_size > 10485760 then
      v_score_format := 5;
      v_status_format := 'warn';
      v_desc_format := upper(v_ext) || ' format is accepted, but file size exceeds 10MB';
    else
      v_score_format := 10;
      v_status_format := 'pass';
      v_desc_format := upper(v_ext) || ' format is ATS-friendly';
    end if;
  elsif v_ext = 'doc' then
    v_score_format := 5;
    v_status_format := 'warn';
    v_desc_format := 'Legacy DOC format detected; modern ATS prefer PDF or DOCX';
  else
    v_score_format := 0;
    v_status_format := 'fail';
    v_desc_format := 'Unsupported resume format (.' || coalesce(v_ext, 'unknown') || '); please use PDF or DOCX';
  end if;

  -- 2. Resume Parseability (Max 10 pts)
  v_text_len := length(coalesce(v_resume.extracted_text, ''));
  if v_text_len >= 250 then
    v_score_parse := 10;
    v_status_parse := 'pass';
    v_desc_parse := 'Resume text is machine-readable (' || v_text_len || ' characters extracted)';
  elsif v_text_len >= 80 then
    v_score_parse := 5;
    v_status_parse := 'warn';
    v_desc_parse := 'Extracted text is very brief (' || v_text_len || ' characters); some sections may be unreadable';
  else
    v_score_parse := 0;
    v_status_parse := 'fail';
    v_desc_parse := 'Very little machine-readable text was detected; document may be image-only or scanned without OCR';
  end if;

  -- 3. Contact Information (Max 10 pts)
  v_has_name := coalesce(v_analysis.candidate_name, v_candidate.full_name, '') <> '';
  v_has_email := coalesce(v_analysis.email, v_candidate.email, '') ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
  v_has_phone := length(regexp_replace(coalesce(v_analysis.phone, v_candidate.phone, ''), '[^0-9]', '', 'g')) >= 7;

  if v_has_name and v_has_email and v_has_phone then
    v_score_contact := 10;
    v_status_contact := 'pass';
    v_desc_contact := 'Name, email, and phone detected';
  elsif v_has_name and v_has_email then
    v_score_contact := 6;
    v_status_contact := 'warn';
    v_desc_contact := 'Name and email detected, but phone number was not detected';
  elsif v_has_name or v_has_email then
    v_score_contact := 3;
    v_status_contact := 'warn';
    v_desc_contact := 'Partial contact details detected; missing email or phone';
  else
    v_score_contact := 0;
    v_status_contact := 'fail';
    v_desc_contact := 'Essential contact information is missing';
  end if;

  -- 4. Keyword Coverage (Max 20 pts)
  if p_job_id is not null then
    v_title_keywords := 'Job Keyword Coverage';
    if v_job_analysis.id is not null and v_job_analysis.skill_match_percentage is not null then
      declare
        v_match_pct numeric := v_job_analysis.skill_match_percentage;
        v_matched_count int := jsonb_array_length(coalesce(v_job_analysis.matching_skills, '[]'::jsonb));
        v_missing_count int := jsonb_array_length(coalesce(v_job_analysis.missing_skills, '[]'::jsonb));
      begin
        v_details_keywords := jsonb_build_object(
          'job_title', coalesce(v_job.title, 'Target Role'),
          'match_percentage', round(v_match_pct),
          'matching_count', v_matched_count,
          'missing_count', v_missing_count,
          'matching_skills', coalesce(v_job_analysis.matching_skills, '[]'::jsonb),
          'missing_skills', coalesce(v_job_analysis.missing_skills, '[]'::jsonb)
        );
        
        if v_match_pct >= 60 then
          v_score_keywords := 20;
          v_status_keywords := 'pass';
          v_desc_keywords := v_matched_count || ' job keywords matched (' || round(v_match_pct) || '% keyword match)';
        elsif v_match_pct >= 30 then
          v_score_keywords := 10;
          v_status_keywords := 'warn';
          v_desc_keywords := v_matched_count || ' job keywords matched (' || round(v_match_pct) || '% match — missing important skills)';
        else
          v_score_keywords := 4;
          v_status_keywords := 'fail';
          v_desc_keywords := 'Low job keyword coverage (' || round(v_match_pct) || '% match)';
        end if;
      end;
    else
      v_score_keywords := 10;
      v_status_keywords := 'warn';
      v_desc_keywords := 'Job selected; pending skill match computation';
    end if;
  else
    v_title_keywords := 'General ATS Keyword Structure';
    v_skill_count := case 
      when v_analysis.skills is not null then jsonb_array_length(v_analysis.skills) 
      else 0 
    end;
    
    v_details_keywords := jsonb_build_object(
      'mode', 'standalone',
      'skill_count', v_skill_count
    );
    
    if v_skill_count >= 4 then
      v_score_keywords := 20;
      v_status_keywords := 'pass';
      v_desc_keywords := v_skill_count || ' machine-readable professional skills and domain keywords identified';
    elsif v_skill_count >= 1 then
      v_score_keywords := 12;
      v_status_keywords := 'warn';
      v_desc_keywords := v_skill_count || ' skill keywords identified; consider adding more core domain proficiencies';
    else
      v_score_keywords := 2;
      v_status_keywords := 'fail';
      v_desc_keywords := 'No distinct professional skill keywords identified';
    end if;
  end if;

  -- 5. Section Headers (Max 15 pts)
  v_header_count := 0;
  if v_analysis.experience is not null and jsonb_array_length(v_analysis.experience) > 0 then 
    v_header_count := v_header_count + 1; 
  end if;
  if v_analysis.education is not null and jsonb_array_length(v_analysis.education) > 0 then 
    v_header_count := v_header_count + 1; 
  end if;
  if v_analysis.skills is not null and jsonb_array_length(v_analysis.skills) > 0 then 
    v_header_count := v_header_count + 1; 
  end if;
  if (v_analysis.projects is not null and jsonb_array_length(v_analysis.projects) > 0) or 
     (v_analysis.certifications is not null and jsonb_array_length(v_analysis.certifications) > 0) then 
    v_header_count := v_header_count + 1; 
  end if;

  if v_header_count >= 4 then
    v_score_headers := 15;
    v_status_headers := 'pass';
    v_desc_headers := 'All standard sections present (Experience, Education, Skills, Projects/Certifications)';
  elsif v_header_count >= 2 then
    v_score_headers := 8;
    v_status_headers := 'warn';
    v_desc_headers := 'Core sections detected, but some standard sections (e.g. Projects or Summary) are missing';
  else
    v_score_headers := 0;
    v_status_headers := 'fail';
    v_desc_headers := 'Resume structure lacks standard section headings';
  end if;

  -- 6. Font & Formatting (Max 10 pts)
  if coalesce(v_resume.extracted_text, '') ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]' then
    v_score_font := 5;
    v_status_font := 'warn';
    v_desc_font := 'Unusual non-printable character codes detected in text stream; layout formatting could not be fully verified';
  else
    v_score_font := 10;
    v_status_font := 'pass';
    v_desc_font := 'Formatting could not be fully verified from available document data; basic machine-readable text layout preserved without unreadable symbols';
  end if;

  -- 7. Skills Section (Max 10 pts)
  v_skill_count := case 
    when v_analysis.skills is not null then jsonb_array_length(v_analysis.skills) 
    else 0 
  end;

  if v_skill_count > 0 then
    v_score_skills := 10;
    v_status_skills := 'pass';
    v_desc_skills := v_skill_count || ' relevant skills clearly listed and machine-readable';
  else
    v_score_skills := 0;
    v_status_skills := 'fail';
    v_desc_skills := 'No distinct machine-readable skills section detected';
  end if;

  -- 8. Work Experience Format (Max 10 pts)
  v_exp_count := case 
    when v_analysis.experience is not null then jsonb_array_length(v_analysis.experience) 
    else 0 
  end;

  if v_exp_count > 0 then
    v_score_exp := 10;
    v_status_exp := 'pass';
    v_desc_exp := 'Reverse chronological format used with job titles and experience entries';
  else
    v_score_exp := 0;
    v_status_exp := 'fail';
    v_desc_exp := 'Work experience entries could not be parsed reliably';
  end if;

  -- 9. Education (Max 5 pts)
  v_edu_count := case 
    when v_analysis.education is not null then jsonb_array_length(v_analysis.education) 
    else 0 
  end;

  if v_edu_count > 0 then
    v_score_edu := 5;
    v_status_edu := 'pass';
    v_desc_edu := 'Education details are clearly structured';
  else
    v_score_edu := 0;
    v_status_edu := 'fail';
    v_desc_edu := 'Education details could not be parsed';
  end if;

  -- Assertions & scoring calculation
  v_total_score := v_score_format + v_score_parse + v_score_contact + v_score_keywords + 
                   v_score_headers + v_score_font + v_score_skills + v_score_exp + v_score_edu;
  
  if v_total_score > 100 then v_total_score := 100; end if;
  if v_total_score < 0 then v_total_score := 0; end if;

  if v_total_score >= 80 then
    v_ats_status := 'ats_friendly';
  elsif v_total_score >= 60 then
    v_ats_status := 'needs_improvement';
  else
    v_ats_status := 'poor_compatibility';
  end if;

  v_passed_count := (case when v_status_format = 'pass' then 1 else 0 end) +
                    (case when v_status_parse = 'pass' then 1 else 0 end) +
                    (case when v_status_contact = 'pass' then 1 else 0 end) +
                    (case when v_status_keywords = 'pass' then 1 else 0 end) +
                    (case when v_status_headers = 'pass' then 1 else 0 end) +
                    (case when v_status_font = 'pass' then 1 else 0 end) +
                    (case when v_status_skills = 'pass' then 1 else 0 end) +
                    (case when v_status_exp = 'pass' then 1 else 0 end) +
                    (case when v_status_edu = 'pass' then 1 else 0 end);

  v_warning_count := (case when v_status_format = 'warn' then 1 else 0 end) +
                     (case when v_status_parse = 'warn' then 1 else 0 end) +
                     (case when v_status_contact = 'warn' then 1 else 0 end) +
                     (case when v_status_keywords = 'warn' then 1 else 0 end) +
                     (case when v_status_headers = 'warn' then 1 else 0 end) +
                     (case when v_status_font = 'warn' then 1 else 0 end) +
                     (case when v_status_skills = 'warn' then 1 else 0 end) +
                     (case when v_status_exp = 'warn' then 1 else 0 end) +
                     (case when v_status_edu = 'warn' then 1 else 0 end);

  v_failed_count := 9 - (v_passed_count + v_warning_count);

  -- Recommendations
  v_recs := '[]'::jsonb;
  if not v_has_phone then
    v_recs := v_recs || jsonb_build_array('Add a clearly visible telephone number in the header contact section.');
  end if;
  if not v_has_email then
    v_recs := v_recs || jsonb_build_array('Include an accessible, professional email address in the contact section.');
  end if;
  if v_header_count < 4 then
    v_recs := v_recs || jsonb_build_array('Use standard headings such as "Experience", "Education", and "Skills" so ATS parsers identify sections accurately.');
  end if;
  if v_skill_count = 0 then
    v_recs := v_recs || jsonb_build_array('Add a distinct Skills section listing your core technical competencies and tools.');
  end if;
  if p_job_id is not null and v_status_keywords in ('warn', 'fail') then
    v_recs := v_recs || jsonb_build_array('Review the target job description and naturally include relevant technical proficiencies you possess.');
  end if;
  if v_status_exp = 'fail' then
    v_recs := v_recs || jsonb_build_array('Structure work experience with clear Job Title, Company Name, and Employment Dates in reverse chronological order.');
  end if;
  if jsonb_array_length(v_recs) = 0 then
    v_recs := jsonb_build_array(
      'Resume structure is ATS-compliant. Keep layout clean and maintain single-column text format.',
      'Continue aligning terminology with role specifications for optimal screening results.'
    );
  end if;

  -- Persistence
  if p_job_id is not null then
    select id into v_existing_report_id
    from public.ats_reports
    where resume_id = p_resume_id and job_id = p_job_id and recruiter_id = v_recruiter_id;
  else
    select id into v_existing_report_id
    from public.ats_reports
    where resume_id = p_resume_id and job_id is null and recruiter_id = v_recruiter_id;
  end if;

  if v_existing_report_id is not null then
    update public.ats_reports set
      ats_score = v_total_score,
      ats_status = v_ats_status,
      passed_count = v_passed_count,
      warning_count = v_warning_count,
      failed_count = v_failed_count,
      overall_summary = 'Deterministic ATS evaluation: ' || v_passed_count || ' passed, ' || v_warning_count || ' warnings, ' || v_failed_count || ' failed.',
      recommendations = v_recs,
      analysis_version = 'ats_v1',
      candidate_id = v_resume.candidate_id,
      updated_at = now()
    where id = v_existing_report_id
    returning id into v_report_id;
  else
    insert into public.ats_reports (
      resume_id,
      job_id,
      candidate_id,
      recruiter_id,
      ats_score,
      ats_status,
      passed_count,
      warning_count,
      failed_count,
      overall_summary,
      recommendations,
      analysis_version
    ) values (
      p_resume_id,
      p_job_id,
      v_resume.candidate_id,
      v_recruiter_id,
      v_total_score,
      v_ats_status,
      v_passed_count,
      v_warning_count,
      v_failed_count,
      'Deterministic ATS evaluation: ' || v_passed_count || ' passed, ' || v_warning_count || ' warnings, ' || v_failed_count || ' failed.',
      v_recs,
      'ats_v1'
    )
    returning id into v_report_id;
  end if;

  delete from public.ats_check_results where ats_report_id = v_report_id;

  insert into public.ats_check_results 
    (ats_report_id, check_type, title, status, score, max_score, description, details, sort_order)
  values
    (v_report_id, 'file_format', 'File Format (PDF/DOCX)', v_status_format, v_score_format, 10, v_desc_format, jsonb_build_object('extension', v_ext, 'file_size', v_resume.file_size), 1),
    (v_report_id, 'parseability', 'Resume Parseability', v_status_parse, v_score_parse, 10, v_desc_parse, jsonb_build_object('characters', v_text_len), 2),
    (v_report_id, 'contact_information', 'Contact Information', v_status_contact, v_score_contact, 10, v_desc_contact, jsonb_build_object('has_name', v_has_name, 'has_email', v_has_email, 'has_phone', v_has_phone), 3),
    (v_report_id, 'keyword_density', v_title_keywords, v_status_keywords, v_score_keywords, 20, v_desc_keywords, v_details_keywords, 4),
    (v_report_id, 'section_headers', 'Section Headers', v_status_headers, v_score_headers, 15, v_desc_headers, jsonb_build_object('headers_detected', v_header_count), 5),
    (v_report_id, 'font_formatting', 'Font & Formatting', v_status_font, v_score_font, 10, v_desc_font, jsonb_build_object('verified', false, 'note', 'Layout formatting unverified from plain text extraction'), 6),
    (v_report_id, 'skills_section', 'Skills Section', v_status_skills, v_score_skills, 10, v_desc_skills, jsonb_build_object('skill_count', v_skill_count), 7),
    (v_report_id, 'work_experience', 'Work Experience Format', v_status_exp, v_score_exp, 10, v_desc_exp, jsonb_build_object('experience_entries', v_exp_count), 8),
    (v_report_id, 'education', 'Education', v_status_edu, v_score_edu, 5, v_desc_edu, jsonb_build_object('education_entries', v_edu_count), 9);

  select json_build_object(
    'report', (
      select json_build_object(
        'id', r.id,
        'resumeId', r.resume_id,
        'jobId', r.job_id,
        'candidateId', r.candidate_id,
        'atsScore', r.ats_score,
        'atsStatus', r.ats_status,
        'passedCount', r.passed_count,
        'warningCount', r.warning_count,
        'failedCount', r.failed_count,
        'overallSummary', r.overall_summary,
        'recommendations', r.recommendations,
        'analysisVersion', r.analysis_version,
        'createdAt', r.created_at,
        'updatedAt', r.updated_at
      ) from public.ats_reports r where r.id = v_report_id
    ),
    'candidate', (
      select json_build_object(
        'id', c.id,
        'name', coalesce(c.full_name, v_analysis.candidate_name, 'Unknown Candidate'),
        'email', coalesce(c.email, v_analysis.email, ''),
        'role', coalesce(c.current_job_title, 'Candidate'),
        'matchScore', c.match_score,
        'resumeScore', c.resume_score,
        'status', c.status
      ) from public.candidates c where c.id = v_resume.candidate_id
    ),
    'checks', (
      select json_agg(json_build_object(
        'id', cr.id,
        'checkType', cr.check_type,
        'title', cr.title,
        'status', cr.status,
        'score', cr.score,
        'maxScore', cr.max_score,
        'description', cr.description,
        'details', cr.details,
        'sortOrder', cr.sort_order
      ) order by cr.sort_order)
      from public.ats_check_results cr
      where cr.ats_report_id = v_report_id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.run_ats_check(uuid, uuid) from public;
revoke execute on function public.run_ats_check(uuid, uuid) from anon;
grant execute on function public.run_ats_check(uuid, uuid) to authenticated;

-- ============================================================================
-- SCREEN 7: DUPLICATE RESUME DETECTION
-- ============================================================================

-- Enable pg_trgm extension in extensions schema for fuzzy trigram text similarity
create extension if not exists pg_trgm schema extensions;

-- Table: duplicate_resume_checks
create table if not exists public.duplicate_resume_checks (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references auth.users(id) on delete cascade,
  resume_id_a uuid not null references public.resumes(id) on delete cascade,
  resume_id_b uuid not null references public.resumes(id) on delete cascade,
  similarity_score numeric(5, 2) not null check (similarity_score >= 0.00 and similarity_score <= 100.00),
  detection_type text not null check (detection_type in ('exact_hash', 'content_similarity')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint chk_resume_order check (resume_id_a < resume_id_b),
  constraint uq_duplicate_resume_pair unique (recruiter_id, resume_id_a, resume_id_b)
);

create index if not exists idx_duplicate_resume_recruiter on public.duplicate_resume_checks(recruiter_id);
create index if not exists idx_duplicate_resume_pair on public.duplicate_resume_checks(resume_id_a, resume_id_b);
create index if not exists idx_duplicate_resume_score on public.duplicate_resume_checks(recruiter_id, similarity_score desc);

alter table public.duplicate_resume_checks enable row level security;

drop policy if exists "Recruiters can view their duplicate resume checks" on public.duplicate_resume_checks;
create policy "Recruiters can view their duplicate resume checks"
  on public.duplicate_resume_checks for select
  to authenticated
  using (recruiter_id = auth.uid());

drop policy if exists "Recruiters can insert their duplicate resume checks" on public.duplicate_resume_checks;
create policy "Recruiters can insert their duplicate resume checks"
  on public.duplicate_resume_checks for insert
  to authenticated
  with check (recruiter_id = auth.uid());

drop policy if exists "Recruiters can update their duplicate resume checks" on public.duplicate_resume_checks;
create policy "Recruiters can update their duplicate resume checks"
  on public.duplicate_resume_checks for update
  to authenticated
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());

drop policy if exists "Recruiters can delete their duplicate resume checks" on public.duplicate_resume_checks;
create policy "Recruiters can delete their duplicate resume checks"
  on public.duplicate_resume_checks for delete
  to authenticated
  using (recruiter_id = auth.uid());

-- Text Normalization Helper
create or replace function public.normalize_resume_text(p_text text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(lower(coalesce(p_text, '')), '\s+', ' ', 'g'));
$$;

-- RPC: run_duplicate_detection
create or replace function public.run_duplicate_detection()
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_scanned_count int := 0;
  v_duplicate_pair_count int := 0;
  v_duplicate_resume_count int := 0;
  v_unique_resume_count int := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Unauthorized: User is not authenticated';
  end if;

  -- Create temporary table with genuinely analyzed resumes
  drop table if exists _tmp_analyzed_resumes;
  create temp table _tmp_analyzed_resumes on commit drop as
  select 
    r.id,
    r.file_hash,
    r.extracted_text
  from public.resumes r
  inner join public.resume_analysis ra on ra.resume_id = r.id
  where r.recruiter_id = v_uid
    and r.processing_status = 'analyzed'
    and (
      (r.extracted_text is not null and length(trim(r.extracted_text)) > 0)
      or (r.file_hash is not null and length(trim(r.file_hash)) > 0)
    );

  select count(*) into v_scanned_count from _tmp_analyzed_resumes;

  -- Clear previous checks for this recruiter to maintain idempotency
  delete from public.duplicate_resume_checks where recruiter_id = v_uid;

  if v_scanned_count >= 2 then
    -- Calculate pairwise similarity and insert duplicates with similarity_score > 80.00
    insert into public.duplicate_resume_checks (
      recruiter_id,
      resume_id_a,
      resume_id_b,
      similarity_score,
      detection_type,
      created_at,
      updated_at
    )
    select
      v_uid,
      r1.id as resume_id_a,
      r2.id as resume_id_b,
      calculated.sim_score as similarity_score,
      calculated.det_type as detection_type,
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    from _tmp_analyzed_resumes r1
    join _tmp_analyzed_resumes r2 on r1.id < r2.id
    cross join lateral (
      select
        case
          -- Exact Hash Check: BOTH hashes must be non-null, non-empty, and equal
          when r1.file_hash is not null and r2.file_hash is not null
               and length(trim(r1.file_hash)) > 0 and length(trim(r2.file_hash)) > 0
               and r1.file_hash = r2.file_hash then 100.00
          -- Trigram Similarity Check on normalized text
          when r1.extracted_text is not null and r2.extracted_text is not null
               and length(trim(r1.extracted_text)) > 0 and length(trim(r2.extracted_text)) > 0
               then round((extensions.similarity(public.normalize_resume_text(r1.extracted_text), public.normalize_resume_text(r2.extracted_text)) * 100.0)::numeric, 2)
          else 0.00
        end as sim_score,
        case
          when r1.file_hash is not null and r2.file_hash is not null
               and length(trim(r1.file_hash)) > 0 and length(trim(r2.file_hash)) > 0
               and r1.file_hash = r2.file_hash then 'exact_hash'
          else 'content_similarity'
        end as det_type
    ) calculated
    where calculated.sim_score > 80.00;
  end if;

  -- Count duplicate pairs
  select count(*)
  into v_duplicate_pair_count
  from public.duplicate_resume_checks
  where recruiter_id = v_uid
    and similarity_score > 80.00;

  -- Count DISTINCT resumes participating in duplicate pairs
  select count(distinct resume_id)
  into v_duplicate_resume_count
  from (
    select resume_id_a as resume_id
    from public.duplicate_resume_checks
    where recruiter_id = v_uid and similarity_score > 80.00
    union
    select resume_id_b as resume_id
    from public.duplicate_resume_checks
    where recruiter_id = v_uid and similarity_score > 80.00
  ) sub;

  -- Unique resumes = scanned_count - duplicate_resume_count
  v_unique_resume_count := greatest(0, v_scanned_count - v_duplicate_resume_count);

  return json_build_object(
    'scannedCount', v_scanned_count,
    'duplicatePairCount', v_duplicate_pair_count,
    'duplicateResumeCount', v_duplicate_resume_count,
    'uniqueResumeCount', v_unique_resume_count
  );
end;
$$;

revoke execute on function public.run_duplicate_detection() from public;
revoke execute on function public.run_duplicate_detection() from anon;
grant execute on function public.run_duplicate_detection() to authenticated;

-- RPC: get_duplicate_resume_overview
create or replace function public.get_duplicate_resume_overview()
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_scanned_count int := 0;
  v_duplicate_pair_count int := 0;
  v_duplicate_resume_count int := 0;
  v_unique_resume_count int := 0;
  v_pairs json;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Unauthorized: User is not authenticated';
  end if;

  -- 1. Scanned resumes count
  select count(distinct r.id)
  into v_scanned_count
  from public.resumes r
  inner join public.resume_analysis ra on ra.resume_id = r.id
  where r.recruiter_id = v_uid
    and r.processing_status = 'analyzed'
    and (
      (r.extracted_text is not null and length(trim(r.extracted_text)) > 0)
      or (r.file_hash is not null and length(trim(r.file_hash)) > 0)
    );

  -- 2. Duplicate pairs count
  select count(*)
  into v_duplicate_pair_count
  from public.duplicate_resume_checks
  where recruiter_id = v_uid
    and similarity_score > 80.00;

  -- 3. Distinct duplicate resumes count
  select count(distinct resume_id)
  into v_duplicate_resume_count
  from (
    select resume_id_a as resume_id
    from public.duplicate_resume_checks
    where recruiter_id = v_uid and similarity_score > 80.00
    union
    select resume_id_b as resume_id
    from public.duplicate_resume_checks
    where recruiter_id = v_uid and similarity_score > 80.00
  ) sub;

  -- 4. Unique resumes count
  v_unique_resume_count := greatest(0, v_scanned_count - v_duplicate_resume_count);

  -- 5. Duplicate pairs list (metadata only, NO huge extracted_text)
  select coalesce(json_agg(p order by p."similarityScore" desc, p."createdAt" desc), '[]'::json)
  into v_pairs
  from (
    select
      drc.id,
      drc.similarity_score as "similarityScore",
      drc.detection_type as "detectionType",
      drc.created_at as "createdAt",
      json_build_object(
        'resumeId', ra_res.id,
        'candidateId', c_a.id,
        'candidateName', coalesce(c_a.full_name, an_a.candidate_name, 'Candidate A'),
        'fileName', ra_res.file_name,
        'resumeScore', coalesce(c_a.resume_score, an_a.resume_score, 0),
        'analyzedAt', an_a.created_at
      ) as "resumeA",
      json_build_object(
        'resumeId', rb_res.id,
        'candidateId', c_b.id,
        'candidateName', coalesce(c_b.full_name, an_b.candidate_name, 'Candidate B'),
        'fileName', rb_res.file_name,
        'resumeScore', coalesce(c_b.resume_score, an_b.resume_score, 0),
        'analyzedAt', an_b.created_at
      ) as "resumeB"
    from public.duplicate_resume_checks drc
    join public.resumes ra_res on ra_res.id = drc.resume_id_a
    left join public.candidates c_a on c_a.id = ra_res.candidate_id
    left join public.resume_analysis an_a on an_a.resume_id = ra_res.id
    join public.resumes rb_res on rb_res.id = drc.resume_id_b
    left join public.candidates c_b on c_b.id = rb_res.candidate_id
    left join public.resume_analysis an_b on an_b.resume_id = rb_res.id
    where drc.recruiter_id = v_uid
      and drc.similarity_score > 80.00
  ) p;

  return json_build_object(
    'scannedCount', v_scanned_count,
    'duplicatePairCount', v_duplicate_pair_count,
    'duplicateResumeCount', v_duplicate_resume_count,
    'uniqueResumeCount', v_unique_resume_count,
    'pairs', v_pairs
  );
end;
$$;

revoke execute on function public.get_duplicate_resume_overview() from public;
revoke execute on function public.get_duplicate_resume_overview() from anon;
grant execute on function public.get_duplicate_resume_overview() to authenticated;

-- RPC: get_duplicate_category_resumes
create or replace function public.get_duplicate_category_resumes(p_category text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_resumes json;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Unauthorized: User is not authenticated';
  end if;

  if p_category = 'scanned' then
    select coalesce(json_agg(r order by r."analyzedAt" desc), '[]'::json)
    into v_resumes
    from (
      select 
        res.id as "resumeId",
        c.id as "candidateId",
        coalesce(c.full_name, ra.candidate_name, 'Unknown Candidate') as "candidateName",
        res.file_name as "fileName",
        coalesce(c.resume_score, ra.resume_score, 0) as "resumeScore",
        ra.created_at as "analyzedAt",
        res.file_url as "fileUrl"
      from public.resumes res
      inner join public.resume_analysis ra on ra.resume_id = res.id
      left join public.candidates c on c.id = res.candidate_id
      where res.recruiter_id = v_uid
        and res.processing_status = 'analyzed'
        and (
          (res.extracted_text is not null and length(trim(res.extracted_text)) > 0)
          or (res.file_hash is not null and length(trim(res.file_hash)) > 0)
        )
    ) r;

  elsif p_category = 'duplicate' then
    select coalesce(json_agg(r order by r."analyzedAt" desc), '[]'::json)
    into v_resumes
    from (
      select 
        res.id as "resumeId",
        c.id as "candidateId",
        coalesce(c.full_name, ra.candidate_name, 'Unknown Candidate') as "candidateName",
        res.file_name as "fileName",
        coalesce(c.resume_score, ra.resume_score, 0) as "resumeScore",
        ra.created_at as "analyzedAt",
        res.file_url as "fileUrl"
      from public.resumes res
      inner join public.resume_analysis ra on ra.resume_id = res.id
      left join public.candidates c on c.id = res.candidate_id
      where res.recruiter_id = v_uid
        and res.processing_status = 'analyzed'
        and res.id in (
          select resume_id_a from public.duplicate_resume_checks where recruiter_id = v_uid and similarity_score > 80.00
          union
          select resume_id_b from public.duplicate_resume_checks where recruiter_id = v_uid and similarity_score > 80.00
        )
    ) r;

  elsif p_category = 'unique' then
    select coalesce(json_agg(r order by r."analyzedAt" desc), '[]'::json)
    into v_resumes
    from (
      select 
        res.id as "resumeId",
        c.id as "candidateId",
        coalesce(c.full_name, ra.candidate_name, 'Unknown Candidate') as "candidateName",
        res.file_name as "fileName",
        coalesce(c.resume_score, ra.resume_score, 0) as "resumeScore",
        ra.created_at as "analyzedAt",
        res.file_url as "fileUrl"
      from public.resumes res
      inner join public.resume_analysis ra on ra.resume_id = res.id
      left join public.candidates c on c.id = res.candidate_id
      where res.recruiter_id = v_uid
        and res.processing_status = 'analyzed'
        and (
          (res.extracted_text is not null and length(trim(res.extracted_text)) > 0)
          or (res.file_hash is not null and length(trim(res.file_hash)) > 0)
        )
        and res.id not in (
          select resume_id_a from public.duplicate_resume_checks where recruiter_id = v_uid and similarity_score > 80.00
          union
          select resume_id_b from public.duplicate_resume_checks where recruiter_id = v_uid and similarity_score > 80.00
        )
    ) r;
  else
    v_resumes := '[]'::json;
  end if;

  return v_resumes;
end;
$$;

revoke execute on function public.get_duplicate_category_resumes(text) from public;
revoke execute on function public.get_duplicate_category_resumes(text) from anon;
grant execute on function public.get_duplicate_category_resumes(text) to authenticated;

-- RPC: get_duplicate_resume_comparison
create or replace function public.get_duplicate_resume_comparison(
  p_resume_id_a uuid,
  p_resume_id_b uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_ordered_a uuid;
  v_ordered_b uuid;
  v_check record;
  v_res_a record;
  v_an_a record;
  v_cand_a record;
  v_res_b record;
  v_an_b record;
  v_cand_b record;
  v_common_skills text[];
  v_unique_skills_a text[];
  v_unique_skills_b text[];
  v_skills_a text[];
  v_skills_b text[];
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Unauthorized: User is not authenticated';
  end if;

  if p_resume_id_a is null or p_resume_id_b is null or p_resume_id_a = p_resume_id_b then
    raise exception 'InvalidArguments: Two distinct resume IDs are required';
  end if;

  -- Ensure deterministic order
  if p_resume_id_a < p_resume_id_b then
    v_ordered_a := p_resume_id_a;
    v_ordered_b := p_resume_id_b;
  else
    v_ordered_a := p_resume_id_b;
    v_ordered_b := p_resume_id_a;
  end if;

  -- Verify ownership of Resume A
  select * into v_res_a
  from public.resumes
  where id = v_ordered_a and recruiter_id = v_uid;

  if not found then
    raise exception 'AccessDenied: Resume A not found or not owned by recruiter';
  end if;

  -- Verify ownership of Resume B
  select * into v_res_b
  from public.resumes
  where id = v_ordered_b and recruiter_id = v_uid;

  if not found then
    raise exception 'AccessDenied: Resume B not found or not owned by recruiter';
  end if;

  -- Verify pair exists in duplicate_resume_checks with similarity_score > 80.00
  select * into v_check
  from public.duplicate_resume_checks
  where recruiter_id = v_uid
    and resume_id_a = v_ordered_a
    and resume_id_b = v_ordered_b
    and similarity_score > 80.00;

  if not found then
    raise exception 'AccessDenied: No authorized duplicate pair exists for these resumes with similarity > 80%%';
  end if;

  -- Fetch analysis and candidate for A
  select * into v_an_a from public.resume_analysis where resume_id = v_ordered_a;
  select * into v_cand_a from public.candidates where id = v_res_a.candidate_id;

  -- Fetch analysis and candidate for B
  select * into v_an_b from public.resume_analysis where resume_id = v_ordered_b;
  select * into v_cand_b from public.candidates where id = v_res_b.candidate_id;

  -- Extract skills arrays safely
  select coalesce(array_agg(elem::text), '{}'::text[])
  into v_skills_a
  from jsonb_array_elements_text(
    case 
      when jsonb_typeof(coalesce(v_an_a.skills, '[]'::jsonb)) = 'array' 
      then coalesce(v_an_a.skills, '[]'::jsonb) 
      else '[]'::jsonb 
    end
  ) elem;

  select coalesce(array_agg(elem::text), '{}'::text[])
  into v_skills_b
  from jsonb_array_elements_text(
    case 
      when jsonb_typeof(coalesce(v_an_b.skills, '[]'::jsonb)) = 'array' 
      then coalesce(v_an_b.skills, '[]'::jsonb) 
      else '[]'::jsonb 
    end
  ) elem;

  -- Common and unique skills
  select coalesce(array_agg(s), '{}'::text[])
  into v_common_skills
  from (
    select unnest(v_skills_a) as s
    intersect
    select unnest(v_skills_b) as s
  ) c;

  select coalesce(array_agg(s), '{}'::text[])
  into v_unique_skills_a
  from (
    select unnest(v_skills_a) as s
    except
    select unnest(v_skills_b) as s
  ) u;

  select coalesce(array_agg(s), '{}'::text[])
  into v_unique_skills_b
  from (
    select unnest(v_skills_b) as s
    except
    select unnest(v_skills_a) as s
  ) u;

  return json_build_object(
    'similarityScore', v_check.similarity_score,
    'detectionType', v_check.detection_type,
    'createdAt', v_check.created_at,
    'commonSkills', v_common_skills,
    'resumeA', json_build_object(
      'resumeId', v_res_a.id,
      'candidateId', v_cand_a.id,
      'candidateName', coalesce(v_cand_a.full_name, v_an_a.candidate_name, 'Candidate A'),
      'email', coalesce(v_cand_a.email, v_an_a.email, ''),
      'phone', coalesce(v_cand_a.phone, v_an_a.phone, ''),
      'fileName', v_res_a.file_name,
      'fileUrl', v_res_a.file_url,
      'resumeScore', coalesce(v_cand_a.resume_score, v_an_a.resume_score, 0),
      'skills', coalesce(v_an_a.skills, '[]'::jsonb),
      'uniqueSkills', v_unique_skills_a,
      'education', coalesce(v_an_a.education, '[]'::jsonb),
      'experience', coalesce(v_an_a.experience, '[]'::jsonb),
      'projects', coalesce(v_an_a.projects, '[]'::jsonb),
      'certifications', coalesce(v_an_a.certifications, '[]'::jsonb),
      'summary', v_an_a.summary,
      'textPreview', case 
        when v_res_a.extracted_text is not null 
        then left(v_res_a.extracted_text, 600) 
        else '' 
      end,
      'analyzedAt', v_an_a.created_at
    ),
    'resumeB', json_build_object(
      'resumeId', v_res_b.id,
      'candidateId', v_cand_b.id,
      'candidateName', coalesce(v_cand_b.full_name, v_an_b.candidate_name, 'Candidate B'),
      'email', coalesce(v_cand_b.email, v_an_b.email, ''),
      'phone', coalesce(v_cand_b.phone, v_an_b.phone, ''),
      'fileName', v_res_b.file_name,
      'fileUrl', v_res_b.file_url,
      'resumeScore', coalesce(v_cand_b.resume_score, v_an_b.resume_score, 0),
      'skills', coalesce(v_an_b.skills, '[]'::jsonb),
      'uniqueSkills', v_unique_skills_b,
      'education', coalesce(v_an_b.education, '[]'::jsonb),
      'experience', coalesce(v_an_b.experience, '[]'::jsonb),
      'projects', coalesce(v_an_b.projects, '[]'::jsonb),
      'certifications', coalesce(v_an_b.certifications, '[]'::jsonb),
      'summary', v_an_b.summary,
      'textPreview', case 
        when v_res_b.extracted_text is not null 
        then left(v_res_b.extracted_text, 600) 
        else '' 
      end,
      'analyzedAt', v_an_b.created_at
    )
  );
end;
$$;

revoke execute on function public.get_duplicate_resume_comparison(uuid, uuid) from public;
revoke execute on function public.get_duplicate_resume_comparison(uuid, uuid) from anon;
grant execute on function public.get_duplicate_resume_comparison(uuid, uuid) to authenticated;

-- =====================================================================
-- 15. SCREEN 8 — ASSESSMENT BUILDER & CONFIGURATION SCHEMA & RPCS
-- =====================================================================

-- 15.1 Assessment Modules Table
create table if not exists public.assessment_modules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  category text default 'technical',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 15.2 Assessments Table
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  total_questions integer not null check (total_questions > 0),
  passing_score numeric(5,2) not null check (passing_score >= 0 and passing_score <= 100),
  instructions text,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 15.3 Assessment Modules Configuration Table
create table if not exists public.assessment_modules_config (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  module_id uuid not null references public.assessment_modules(id),
  weight_percent numeric(5,2) not null check (weight_percent > 0 and weight_percent <= 100),
  question_count integer not null check (question_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, module_id)
);

-- 15.4 Assessment Questions Bank
create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.assessment_modules(id) on delete cascade,
  question_type text not null check (question_type in ('mcq', 'multiple_select', 'true_false', 'short_answer', 'coding')),
  question_text text not null,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  options jsonb,
  correct_answer jsonb,
  explanation text,
  points numeric(8,2) not null default 1 check (points > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 15.5 Assessment Question Items Snapshot
create table if not exists public.assessment_question_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id),
  module_id uuid references public.assessment_modules(id),
  question_number integer not null,
  points numeric(8,2) not null default 1,
  created_at timestamptz not null default now(),
  unique (assessment_id, question_number)
);

-- 15.6 Assessment Candidate Assignments
create table if not exists public.assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  status text not null default 'assigned' check (status in ('assigned', 'started', 'submitted', 'expired', 'cancelled')),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,
  unique (assessment_id, candidate_id)
);

-- 15.7 Assessment Candidate Attempts
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id),
  started_at timestamptz,
  submitted_at timestamptz,
  score numeric(5,2),
  percentage numeric(5,2),
  passed boolean,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'expired')),
  created_at timestamptz not null default now()
);

-- 15.8 Assessment Attempt Answers
create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id),
  answer jsonb,
  is_correct boolean,
  points_awarded numeric(8,2) default 0,
  answered_at timestamptz default now(),
  unique (attempt_id, question_id)
);

-- Enable RLS
alter table public.assessment_modules enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_modules_config enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_question_items enable row level security;
alter table public.assessment_assignments enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;

-- 16. USER PERSONAL DATA & SETTINGS PREFERENCES
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  email_notifications boolean default true,
  new_resume_alert boolean default true,
  analysis_completed_alert boolean default true,
  duplicate_resume_alert boolean default true,
  assessment_assigned_alert boolean default true,
  assessment_completed_alert boolean default true,
  shortlisted_alert boolean default true,
  rejection_alert boolean default false,
  weekly_summary boolean default true,
  system_security_alerts boolean default true,
  in_app_notifications boolean default true,
  reminder_enabled boolean default true,
  reminder_hours_before integer default 24,
  reminder_frequency text default 'once',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.privacy_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  profile_visibility text default 'private' check (profile_visibility in ('public', 'private', 'team')),
  resume_visibility text default 'private' check (resume_visibility in ('public', 'private', 'team')),
  analytics_enabled boolean default true,
  personalization_enabled boolean default true,
  activity_tracking_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.data_retention_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  resume_retention_days integer default 365,
  candidate_retention_days integer default 365,
  assessment_retention_days integer default 730,
  auto_delete_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.recruiter_screening_preferences (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null unique references public.profiles(id) on delete cascade,
  minimum_resume_score numeric default 60,
  minimum_match_score numeric default 60,
  minimum_experience_years numeric default 0,
  required_education text default 'any',
  mandatory_skills jsonb default '[]'::jsonb,
  optional_skills jsonb default '[]'::jsonb,
  minimum_ats_score numeric default 60,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on User Settings Tables
alter table public.notification_preferences enable row level security;
alter table public.privacy_settings enable row level security;
alter table public.data_retention_settings enable row level security;
alter table public.recruiter_screening_preferences enable row level security;

create policy "Users can view their own notification preferences" on public.notification_preferences for select using (auth.uid() = user_id);
create policy "Users can insert their own notification preferences" on public.notification_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update their own notification preferences" on public.notification_preferences for update using (auth.uid() = user_id);

create policy "Users can view their own privacy settings" on public.privacy_settings for select using (auth.uid() = user_id);
create policy "Users can insert their own privacy settings" on public.privacy_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own privacy settings" on public.privacy_settings for update using (auth.uid() = user_id);

create policy "Users can view their own data retention settings" on public.data_retention_settings for select using (auth.uid() = user_id);
create policy "Users can insert their own data retention settings" on public.data_retention_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own data retention settings" on public.data_retention_settings for update using (auth.uid() = user_id);

create policy "Users can view their own screening preferences" on public.recruiter_screening_preferences for select using (auth.uid() = recruiter_id);
create policy "Users can insert their own screening preferences" on public.recruiter_screening_preferences for insert with check (auth.uid() = recruiter_id);
create policy "Users can update their own screening preferences" on public.recruiter_screening_preferences for update using (auth.uid() = recruiter_id);

-- 17. SCREEN 9: SETTINGS EXTENSIONS & AUDIT
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('bug_report', 'feature_request', 'account_issue', 'billing', 'other')),
  subject text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  member_user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'recruiter', 'hiring_manager', 'interviewer', 'viewer')),
  status text not null default 'invited' check (status in ('invited', 'active', 'inactive', 'suspended')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  email_service_enabled boolean default false,
  slack_enabled boolean default false,
  slack_webhook_url text,
  teams_enabled boolean default false,
  teams_webhook_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.email_preferences (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null unique references public.profiles(id) on delete cascade,
  application_received boolean default true,
  analysis_completed boolean default true,
  assessment_invitation boolean default true,
  assessment_reminder boolean default true,
  assessment_completed boolean default true,
  shortlisted_notification boolean default true,
  rejection_notification boolean default false,
  new_resume boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  template_type text not null,
  subject text not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (recruiter_id, template_type)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.support_tickets enable row level security;
alter table public.team_members enable row level security;
alter table public.integration_settings enable row level security;
alter table public.email_preferences enable row level security;
alter table public.email_templates enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can view own support tickets" on public.support_tickets for select using (auth.uid() = user_id);
create policy "Users can insert own support tickets" on public.support_tickets for insert with check (auth.uid() = user_id);
create policy "Users can update own support tickets" on public.support_tickets for update using (auth.uid() = user_id);

create policy "Owners can view their team members" on public.team_members for select using (auth.uid() = owner_user_id or auth.uid() = member_user_id);
create policy "Owners can insert team members" on public.team_members for insert with check (auth.uid() = owner_user_id);
create policy "Owners can update team members" on public.team_members for update using (auth.uid() = owner_user_id);
create policy "Owners can delete team members" on public.team_members for delete using (auth.uid() = owner_user_id);

create policy "Users can view own integration settings" on public.integration_settings for select using (auth.uid() = user_id);
create policy "Users can insert own integration settings" on public.integration_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own integration settings" on public.integration_settings for update using (auth.uid() = user_id);

create policy "Recruiters can view own email preferences" on public.email_preferences for select using (auth.uid() = recruiter_id);
create policy "Recruiters can insert own email preferences" on public.email_preferences for insert with check (auth.uid() = recruiter_id);
create policy "Recruiters can update own email preferences" on public.email_preferences for update using (auth.uid() = recruiter_id);

create policy "Recruiters can view own email templates" on public.email_templates for select using (auth.uid() = recruiter_id);
create policy "Recruiters can insert own email templates" on public.email_templates for insert with check (auth.uid() = recruiter_id);
create policy "Recruiters can update own email templates" on public.email_templates for update using (auth.uid() = recruiter_id);
create policy "Recruiters can delete own email templates" on public.email_templates for delete using (auth.uid() = recruiter_id);

create policy "Users can view own audit logs" on public.audit_logs for select using (auth.uid() = user_id);
create policy "Users can insert own audit logs" on public.audit_logs for insert with check (auth.uid() = user_id);



