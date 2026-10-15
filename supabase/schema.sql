-- Card Vault 2.0 — Supabase schema
-- Run this in the Supabase Dashboard SQL editor (one free project is enough).
-- After running: Settings → API → copy the Project URL and the `anon` `public`
-- key into your Vercel env vars as NEXT_PUBLIC_SUPABASE_URL and
-- NEXT_PUBLIC_SUPABASE_ANON_KEY.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ collections
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------- collection_cards
create table if not exists public.collection_cards (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  ygo_id integer not null,
  name text not null,
  qty integer not null default 1,
  set_code text,
  rarity text,
  price numeric not null default 0,
  card_image_url text,
  -- Display metadata the UI needs (type, attribute, race, archetype, set name).
  -- The canonical card data always comes from the free YGOPRODeck API by ygo_id.
  meta jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now()
);

create index if not exists collection_cards_collection_id_idx
  on public.collection_cards (collection_id);

-- ------------------------------------------------------------------ decks
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  main integer[] not null default '{}',
  extra integer[] not null default '{}',
  side integer[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists decks_user_id_idx on public.decks (user_id);
create index if not exists collections_user_id_idx on public.collections (user_id);

-- ------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.collection_cards enable row level security;
alter table public.decks enable row level security;

-- profiles: users manage only their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- collections: users manage only their own collections
drop policy if exists "collections_all_own" on public.collections;
create policy "collections_all_own" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- collection_cards: allowed only through a collection the user owns
drop policy if exists "collection_cards_all_own" on public.collection_cards;
create policy "collection_cards_all_own" on public.collection_cards
  for all using (
    exists (
      select 1 from public.collections
      where collections.id = collection_cards.collection_id
        and collections.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.collections
      where collections.id = collection_cards.collection_id
        and collections.user_id = auth.uid()
    )
  );

-- decks: users manage only their own decks
drop policy if exists "decks_all_own" on public.decks;
create policy "decks_all_own" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
