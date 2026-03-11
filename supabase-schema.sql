-- รันใน Supabase SQL Editor เพื่อสร้างตารางเก็บสถานะ Dashboard
-- Dashboard > SQL Editor > New query > วางแล้ว Run

-- ถ้ามีตาราง dashboard_state อยู่แล้ว ให้รันคำสั่งนี้เพิ่มคอลัมน์ (ถ้ายังไม่มี)
-- alter table public.dashboard_state add column if not exists team_ids jsonb not null default '["green","red","yellow","blue"]';
-- alter table public.dashboard_state add column if not exists team_names jsonb not null default '{"green":"ทีมสีเขียว","red":"ทีมสีแดง","yellow":"ทีมสีเหลือง","blue":"ทีมสีน้ำเงิน"}';
-- alter table public.dashboard_state add column if not exists team_colors jsonb default '{"green":"#00c853","red":"#c62828","yellow":"#ffc107","blue":"#1565c0"}';
-- alter table public.dashboard_state add column if not exists dashboard_title text default 'ORIENTATION SPORT DAY';

create table if not exists public.dashboard_state (
  id text primary key default 'default',
  dashboard_title text default 'ORIENTATION SPORT DAY',
  team_ids jsonb not null default '["green","red","yellow","blue"]',
  team_names jsonb not null default '{"green":"ทีมสีเขียว","red":"ทีมสีแดง","yellow":"ทีมสีเหลือง","blue":"ทีมสีน้ำเงิน"}',
  team_colors jsonb default '{"green":"#00c853","red":"#c62828","yellow":"#ffc107","blue":"#1565c0"}',
  scores jsonb not null default '{"green":0,"red":0,"yellow":0,"blue":0}',
  medals jsonb not null default '{"green":0,"red":0,"yellow":0,"blue":0}',
  last_update timestamptz,
  timer_seconds int not null default 300,
  updated_at timestamptz default now()
);

-- ใส่แถวเริ่มต้น
insert into public.dashboard_state (id, dashboard_title, team_ids, team_names, team_colors, scores, medals, last_update, timer_seconds)
values ('default', 'ORIENTATION SPORT DAY', '["green","red","yellow","blue"]', '{"green":"ทีมสีเขียว","red":"ทีมสีแดง","yellow":"ทีมสีเหลือง","blue":"ทีมสีน้ำเงิน"}', '{"green":"#00c853","red":"#c62828","yellow":"#ffc107","blue":"#1565c0"}', '{"green":0,"red":0,"yellow":0,"blue":0}', '{"green":0,"red":0,"yellow":0,"blue":0}', null, 300)
on conflict (id) do nothing;

-- เปิดให้อ่าน/เขียนได้ (สำหรับ anon key) — ต้องการความปลอดภัยเพิ่มให้ใช้ RLS และ policy
alter table public.dashboard_state enable row level security;

create policy "Allow public read"
  on public.dashboard_state for select
  using (true);

create policy "Allow public update"
  on public.dashboard_state for update
  using (true)
  with check (true);

create policy "Allow public insert"
  on public.dashboard_state for insert
  with check (true);

-- Realtime: ไปที่ Supabase Dashboard > Database > Replication > เปิดตาราง dashboard_state และ team_scores เพื่อให้ทุกอุปกรณ์ sync ทันที

-- ตารางคะแนนแยกตามทีม (หนึ่งแถวต่อทีม)
create table if not exists public.team_scores (
  team text primary key,
  score int not null default 0,
  medals int not null default 0,
  updated_at timestamptz default now()
);

-- ใส่แถวเริ่มต้นทั้ง 4 ทีม
insert into public.team_scores (team, score, medals)
values
  ('green', 0, 0),
  ('red', 0, 0),
  ('yellow', 0, 0),
  ('blue', 0, 0)
on conflict (team) do nothing;

alter table public.team_scores enable row level security;

create policy "Allow public read team_scores"
  on public.team_scores for select using (true);

create policy "Allow public update team_scores"
  on public.team_scores for update using (true) with check (true);

create policy "Allow public insert team_scores"
  on public.team_scores for insert with check (true);

create policy "Allow public delete team_scores"
  on public.team_scores for delete using (true);
