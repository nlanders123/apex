-- ==========================================
-- Water tracking + micronutrients
-- ==========================================

-- Water tracking on daily logs (ml per day)
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS water_ml INTEGER NOT NULL DEFAULT 0;

-- Micronutrients on logged meals (nullable — not all foods have this data)
ALTER TABLE logged_meals ADD COLUMN IF NOT EXISTS fiber INTEGER;
ALTER TABLE logged_meals ADD COLUMN IF NOT EXISTS sodium INTEGER;
ALTER TABLE logged_meals ADD COLUMN IF NOT EXISTS sugar INTEGER;

-- Same on saved meals so favourites preserve micronutrients
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS fiber INTEGER;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS sodium INTEGER;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS sugar INTEGER;
