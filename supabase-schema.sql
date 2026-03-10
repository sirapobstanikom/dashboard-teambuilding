-- รันใน Supabase SQL Editor เพื่อสร้างตารางเก็บสถานะ Dashboard
-- Dashboard > SQL Editor > New query > วางแล้ว Run

create table if not exists public.dashboard_state (
  id text primary key default 'default',
  scores jsonb not null default '{"green":0,"red":0,"yellow":0,"blue":0}',
  medals jsonb not null default '{"green":0,"red":0,"yellow":0,"blue":0}',
  last_update timestamptz,
  timer_seconds int not null default 300,
  updated_at timestamptz default now()
);

-- ใส่แถวเริ่มต้น
insert into public.dashboard_state (id, scores, medals, last_update, timer_seconds)
values ('default', '{"green":0,"red":0,"yellow":0,"blue":0}', '{"green":0,"red":0,"yellow":0,"blue":0}', null, 300)
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
