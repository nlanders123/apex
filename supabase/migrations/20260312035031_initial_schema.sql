-- ==========================================
-- APEX: Initial Schema
-- Consolidates base schema + migration 001
-- ==========================================

-- Meal category enum
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- ==========================================
-- PROFILES
-- ==========================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    onboarded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Nutrition targets
    target_calories INTEGER DEFAULT 2500,
    target_protein INTEGER DEFAULT 180,
    target_fat INTEGER DEFAULT 70,
    target_carbs INTEGER DEFAULT 250
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- NUTRITION: Daily Logs + Meals
-- ==========================================
CREATE TABLE daily_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Snapshot of targets on this day
    target_calories INTEGER,
    target_protein INTEGER,
    target_fat INTEGER,
    target_carbs INTEGER,

    UNIQUE(user_id, date)
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own daily logs" ON daily_logs FOR ALL USING (auth.uid() = user_id);

CREATE TABLE logged_meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    daily_log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    name TEXT NOT NULL,
    category meal_type NOT NULL,

    calories INTEGER NOT NULL DEFAULT 0,
    protein INTEGER NOT NULL DEFAULT 0,
    fat INTEGER NOT NULL DEFAULT 0,
    carbs INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE logged_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own logged meals" ON logged_meals FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- WORKOUTS: Templates
-- ==========================================
CREATE TABLE workout_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON workout_templates FOR ALL USING (auth.uid() = user_id);

CREATE TABLE template_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own template exercises" ON template_exercises FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_template_exercises_template_id ON template_exercises(template_id);

-- ==========================================
-- WORKOUTS: Sessions + Logged Data
-- ==========================================
CREATE TABLE workout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration_minutes INTEGER,
    notes TEXT
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON workout_sessions FOR ALL USING (auth.uid() = user_id);

CREATE TABLE logged_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    notes TEXT
);

ALTER TABLE logged_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own logged exercises" ON logged_exercises FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_logged_exercises_session_id ON logged_exercises(session_id);

CREATE TABLE logged_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID REFERENCES logged_exercises(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    set_number INTEGER NOT NULL,
    weight_kg NUMERIC,
    reps INTEGER,
    is_warmup BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE logged_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own logged sets" ON logged_sets FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_logged_sets_exercise_id ON logged_sets(exercise_id);
