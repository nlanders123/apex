-- ==========================================
-- Performance indexes for common query patterns
-- ==========================================

-- daily_logs: filtered by (user_id, date) on every nutrition load
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);

-- logged_meals: filtered by daily_log_id on every meal fetch
CREATE INDEX IF NOT EXISTS idx_logged_meals_daily_log_id ON logged_meals(daily_log_id);

-- workout_sessions: filtered by (user_id, date DESC) for stats + history
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date DESC);

-- logged_exercises: filtered by (user_id, exercise_id) for progressive overload lookups
CREATE INDEX IF NOT EXISTS idx_logged_exercises_user_exercise ON logged_exercises(user_id, exercise_id);

-- body_weight: filtered by (user_id, date DESC) for history chart
CREATE INDEX IF NOT EXISTS idx_body_weight_user_date ON body_weight(user_id, date DESC);
