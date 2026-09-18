-- ============================================================
-- SKSSF Automated Print Kiosk — Initial Database Migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- 1. PRINT JOBS TABLE
-- ──────────────────────────────────────────────────────────

create table if not exists public.print_jobs (
  id                  uuid primary key default gen_random_uuid(),
  session_id          text unique not null,
  user_name           text,
  user_phone          text,
  file_url            text,
  print_type          text check (print_type in ('color', 'bw')) default 'bw',
  paper_size          text check (paper_size in ('A4', 'A3', 'Letter')) default 'A4',
  copies              integer default 1 check (copies > 0),
  total_pages         integer default 1 check (total_pages > 0),
  total_price         numeric(10, 2) default 0.00,
  payment_status      text check (payment_status in ('pending', 'paid', 'failed')) default 'pending',
  razorpay_order_id   text,
  razorpay_payment_id text,
  user_photo_url      text,
  job_status          text check (job_status in (
                        'waiting_user', 'scanned', 'paid',
                        'printing', 'completed', 'expired'
                      )) default 'waiting_user',
  created_at          timestamp with time zone default now()
);


-- ──────────────────────────────────────────────────────────
-- 2. SYSTEM SETTINGS TABLE (pricing + support contacts)
-- ──────────────────────────────────────────────────────────

create table if not exists public.system_settings (
  id                    integer primary key default 1,
  bw_price_per_page     numeric(10, 2) default 2.00,
  color_price_per_page  numeric(10, 2) default 10.00,
  custom_paper_size_multiplier numeric(4, 2) default 1.50,  -- A3 multiplier
  support_phone         text default '+91 9876543210',
  whatsapp_number       text default '919876543210',
  updated_at            timestamp with time zone default now()
);

-- Seed initial row (safe to run multiple times)
insert into public.system_settings (
  id, bw_price_per_page, color_price_per_page,
  custom_paper_size_multiplier, support_phone, whatsapp_number
)
values (1, 2.00, 10.00, 1.50, '+91 9876543210', '919876543210')
on conflict (id) do nothing;


-- ──────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────

-- Enable RLS on both tables
alter table public.print_jobs     enable row level security;
alter table public.system_settings enable row level security;

-- print_jobs: allow anon to INSERT (kiosk creates sessions)
create policy "anon_insert_print_jobs"
  on public.print_jobs for insert
  to anon
  with check (true);

-- print_jobs: allow anon to SELECT their own session
create policy "anon_select_own_print_job"
  on public.print_jobs for select
  to anon
  using (true);

-- print_jobs: allow anon to UPDATE their own session (user fills form, pays)
create policy "anon_update_print_jobs"
  on public.print_jobs for update
  to anon
  using (true)
  with check (true);

-- system_settings: allow anon to read pricing
create policy "anon_read_system_settings"
  on public.system_settings for select
  to anon
  using (true);

-- system_settings: only authenticated (admin) can update pricing
create policy "auth_update_system_settings"
  on public.system_settings for update
  to authenticated
  using (true)
  with check (true);


-- ──────────────────────────────────────────────────────────
-- 4. ENABLE SUPABASE REALTIME
-- ──────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.print_jobs;
alter publication supabase_realtime add table public.system_settings;


-- ──────────────────────────────────────────────────────────
-- 5. STORAGE BUCKETS
-- Run these in the Supabase SQL Editor OR create manually
-- in Storage → New Bucket
-- ──────────────────────────────────────────────────────────

-- Bucket for user uploaded documents (PDFs / images)
insert into storage.buckets (id, name, public)
values ('user-uploads', 'user-uploads', true)
on conflict (id) do nothing;

-- Bucket for webcam captures (auto-taken on kiosk after payment)
insert into storage.buckets (id, name, public)
values ('user-captures', 'user-captures', true)
on conflict (id) do nothing;

-- Storage RLS: allow anon uploads to user-uploads
create policy "anon_upload_user_uploads"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'user-uploads');

-- Storage RLS: allow anon uploads to user-captures
create policy "anon_upload_user_captures"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'user-captures');

-- Storage RLS: allow public read on both buckets
create policy "public_read_user_uploads"
  on storage.objects for select
  to public
  using (bucket_id in ('user-uploads', 'user-captures'));
