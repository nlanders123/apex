-- Migrate from fixed meal_type enum to flexible text-based meal slots
-- Supports "meal_1", "meal_2", ... "meal_N" instead of breakfast/lunch/dinner/snack

-- Convert logged_meals.category from enum to text
alter table logged_meals alter column category type text using category::text;

-- Convert saved_meals.category from enum to text
alter table saved_meals alter column category type text using category::text;

-- Migrate existing data: map old enum values to meal slots
update logged_meals set category = 'meal_1' where category = 'breakfast';
update logged_meals set category = 'meal_2' where category = 'lunch';
update logged_meals set category = 'meal_3' where category = 'dinner';
update logged_meals set category = 'meal_4' where category = 'snack';

update saved_meals set category = 'meal_1' where category = 'breakfast';
update saved_meals set category = 'meal_2' where category = 'lunch';
update saved_meals set category = 'meal_3' where category = 'dinner';
update saved_meals set category = 'meal_4' where category = 'snack';

-- Drop defaults that reference the enum before dropping it
alter table saved_meals alter column category set default 'meal_1';
alter table logged_meals alter column category set default 'meal_1';

-- Add meal_count preference to profiles (default 6)
alter table profiles add column meal_count int not null default 6;

-- Drop the old enum type (no longer needed)
drop type meal_type;
