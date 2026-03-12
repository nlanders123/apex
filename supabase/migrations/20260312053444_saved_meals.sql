-- Saved meals: reusable meal templates for quick logging
create table saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category meal_type not null default 'snack',
  calories integer not null default 0,
  protein integer not null default 0,
  fat integer not null default 0,
  carbs integer not null default 0,
  use_count integer not null default 0,
  created_at timestamp with time zone default now()
);

-- Index for fetching user's saved meals sorted by frequency
create index idx_saved_meals_user on saved_meals(user_id, use_count desc);

-- RLS
alter table saved_meals enable row level security;

create policy "Users can read own saved meals"
  on saved_meals for select using (auth.uid() = user_id);

create policy "Users can insert own saved meals"
  on saved_meals for insert with check (auth.uid() = user_id);

create policy "Users can update own saved meals"
  on saved_meals for update using (auth.uid() = user_id);

create policy "Users can delete own saved meals"
  on saved_meals for delete using (auth.uid() = user_id);
