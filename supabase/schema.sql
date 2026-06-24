-- Run this once in your Supabase project → SQL Editor

create table if not exists public.transactions (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  type        text        not null check (type in ('income', 'expense')),
  amount      numeric(10,2) not null check (amount > 0),
  category    text        not null,
  note        text,
  date        date        not null default current_date,
  created_at  timestamptz default now() not null
);

-- Row Level Security: users only see their own rows
alter table public.transactions enable row level security;

create policy "select own" on public.transactions
  for select using (auth.uid() = user_id);

create policy "insert own" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "update own" on public.transactions
  for update using (auth.uid() = user_id);

create policy "delete own" on public.transactions
  for delete using (auth.uid() = user_id);

-- Index for fast weekly queries
create index if not exists transactions_user_date
  on public.transactions (user_id, date desc);
