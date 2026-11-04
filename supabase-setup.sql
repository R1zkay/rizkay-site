-- RIZKAY — Supabase telepítés
-- Futtasd egy ÚJ Supabase projekt SQL Editor felületén.
-- Ezután a README-HU.md szerint hozd létre és engedélyezd a saját adminfiókot.

create table if not exists public.studio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.studio_admins enable row level security;
revoke all on public.studio_admins from anon, authenticated;

create or replace function public.is_studio_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.studio_admins where user_id = (select auth.uid())); $$;
revoke all on function public.is_studio_admin() from public;
grant execute on function public.is_studio_admin() to anon, authenticated;

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  artist text not null check (char_length(artist) between 1 and 100),
  genre text check (genre is null or char_length(genre) <= 50),
  bpm integer check (bpm is null or bpm between 1 and 400),
  notes text check (notes is null or char_length(notes) <= 300),
  master_path text not null,
  raw_path text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.tracks enable row level security;
grant select on public.tracks to anon, authenticated;
grant insert, update, delete on public.tracks to authenticated;
drop policy if exists "Published tracks are public" on public.tracks;
create policy "Published tracks are public" on public.tracks for select to anon, authenticated
  using (is_published = true or (select public.is_studio_admin()));
drop policy if exists "Admins insert tracks" on public.tracks;
create policy "Admins insert tracks" on public.tracks for insert to authenticated
  with check ((select public.is_studio_admin()));
drop policy if exists "Admins update tracks" on public.tracks;
create policy "Admins update tracks" on public.tracks for update to authenticated
  using ((select public.is_studio_admin())) with check ((select public.is_studio_admin()));
drop policy if exists "Admins delete tracks" on public.tracks;
create policy "Admins delete tracks" on public.tracks for delete to authenticated
  using ((select public.is_studio_admin()));

create table if not exists public.studio_services (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title_hu text not null check (char_length(title_hu) between 1 and 90),
  title_en text not null check (char_length(title_en) between 1 and 90),
  title_de text not null check (char_length(title_de) between 1 and 90),
  description_hu text not null default '' check (char_length(description_hu) <= 350),
  description_en text not null default '' check (char_length(description_en) <= 350),
  description_de text not null default '' check (char_length(description_de) <= 350),
  price_chf numeric(10,2) check (price_chf is null or price_chf > 0),
  revisions_included integer check (revisions_included is null or revisions_included between 0 and 100),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);
alter table public.studio_services enable row level security;
grant select on public.studio_services to anon, authenticated;
grant insert, update, delete on public.studio_services to authenticated;
drop policy if exists "Active services visible to all" on public.studio_services;
create policy "Active services visible to all" on public.studio_services for select to anon, authenticated
  using (is_active = true or (select public.is_studio_admin()));
drop policy if exists "Admin insert services" on public.studio_services;
create policy "Admin insert services" on public.studio_services for insert to authenticated
  with check ((select public.is_studio_admin()));
drop policy if exists "Admin update services" on public.studio_services;
create policy "Admin update services" on public.studio_services for update to authenticated
  using ((select public.is_studio_admin())) with check ((select public.is_studio_admin()));
drop policy if exists "Admin delete services" on public.studio_services;
create policy "Admin delete services" on public.studio_services for delete to authenticated
  using ((select public.is_studio_admin()));

-- Kezdő szolgáltatások: SEM ÁRAT, SEM RE VÍZIÓSZÁMOT NEM TALÁLUNK KI.
-- A NULL ár „egyedi ajánlat”, a NULL revíziószám „megegyezés szerint”.
insert into public.studio_services
(slug, title_hu, title_en, title_de, description_hu, description_en, description_de, price_chf, revisions_included, sort_order)
values
('mixing','Mixing','Mixing','Mixing','Sávok, dinamika, tér és karakter egységes, professzionális mixben.','Balance, dynamics, space and character in a professional mix.','Balance, Dynamik, Raum und Charakter in einem professionellen Mix.',null,null,1),
('mastering','Mastering','Mastering','Mastering','Végső finomhangolás, egységes hangkép és kiadásra kész fájl.','Final polish, tonal consistency and a release-ready master.','Letzter Feinschliff, ausgewogener Sound und releasefertiges Master.',null,null,2),
('mix-master','Mixing + Mastering','Mixing + Mastering','Mixing + Mastering','A teljes út a nyers sávoktól a végleges masterig.','A complete workflow from raw stems to final master.','Komplettpaket von den Rohspuren bis zum finalen Master.',null,null,3),
('stem-mixing','Stem Mixing','Stem Mixing','Stem Mixing','Csoportosított stemsávok kiegyensúlyozása és végső mixelése.','Mixing from grouped stems, with focus on balance and impact.','Mixing aus gruppierten Stems mit Fokus auf Balance und Druck.',null,null,4),
('stem-mastering','Stem Mastering','Stem Mastering','Stem Mastering','Több stemsávos master a rugalmasabb hangzásformálásért.','Mastering from multiple stems for greater tonal control.','Mastering aus mehreren Stems für mehr klangliche Kontrolle.',null,null,5)
on conflict (slug) do nothing;

-- Nyilvános portfóliófájlok: nem bizalmas, kiadatlan ügyfélanyagokhoz!
insert into storage.buckets (id, name, public, file_size_limit)
values ('studio-audio', 'studio-audio', true, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;
drop policy if exists "Studio admins can upload" on storage.objects;
create policy "Studio admins can upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'studio-audio' and (select public.is_studio_admin()));
drop policy if exists "Studio admins can read objects" on storage.objects;
create policy "Studio admins can read objects" on storage.objects for select to authenticated
  using (bucket_id = 'studio-audio' and (select public.is_studio_admin()));
drop policy if exists "Studio admins can delete objects" on storage.objects;
create policy "Studio admins can delete objects" on storage.objects for delete to authenticated
  using (bucket_id = 'studio-audio' and (select public.is_studio_admin()));

-- FUTTASD KÜLÖN, A VALÓDI EMAIL CÍMEDDEL, MIUTÁN ELKÉSZÍTETTED A FELHASZNÁLÓT:
-- insert into public.studio_admins (user_id)
-- select id from auth.users where email = 'SAJAT-EMAIL@PELDA.HU'
-- on conflict (user_id) do nothing;
