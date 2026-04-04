-- Calorie Plans: bank/borrow calories for events (birthdays, cheat days, etc.)
-- During the prep window, daily calorie targets are reduced to "bank" calories.
-- On the event day(s), the banked calories are added to the target.

create table calorie_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  event_date date not null,
  event_calories int not null,        -- target calories for the event day
  prep_days int not null default 7,   -- how many days before to spread the deficit
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table calorie_plans enable row level security;

create policy "Users can manage their own calorie plans"
  on calorie_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for quick lookup of active plans
create index idx_calorie_plans_user_active on calorie_plans (user_id, is_active) where is_active = true;
