-- ==========================================
-- APEX Migration: Exercise Library
-- Normalised exercise reference table + FK links
-- ==========================================

-- Muscle group enum
CREATE TYPE muscle_group AS ENUM (
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'forearms', 'quads', 'hamstrings', 'glutes', 'calves',
  'abs', 'full_body', 'cardio'
);

-- Equipment enum
CREATE TYPE equipment_type AS ENUM (
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight',
  'kettlebell', 'band', 'other'
);

-- ==========================================
-- EXERCISES (reference library)
-- ==========================================
CREATE TABLE exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL = global/seed, non-NULL = user-created
    name TEXT NOT NULL,
    canonical_name TEXT NOT NULL,  -- lowercase, trimmed — used for matching
    primary_muscle muscle_group NOT NULL,
    secondary_muscles muscle_group[] DEFAULT '{}',
    equipment equipment_type DEFAULT 'barbell',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Prevent duplicate canonical names per user (or globally for seeds)
    UNIQUE(user_id, canonical_name)
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Users can see all global exercises + their own
CREATE POLICY "Users can view exercises" ON exercises
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can only manage their own custom exercises
CREATE POLICY "Users can create exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises" ON exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises" ON exercises
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_exercises_canonical ON exercises(canonical_name);
CREATE INDEX idx_exercises_muscle ON exercises(primary_muscle);

-- ==========================================
-- Add exercise_id FK to template_exercises and logged_exercises
-- Optional for backward compatibility with existing data
-- ==========================================

ALTER TABLE template_exercises
  ADD COLUMN exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL;

ALTER TABLE logged_exercises
  ADD COLUMN exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL;

CREATE INDEX idx_template_exercises_exercise_id ON template_exercises(exercise_id);
CREATE INDEX idx_logged_exercises_exercise_id ON logged_exercises(exercise_id);

-- ==========================================
-- SEED: Common exercises
-- user_id = NULL means these are global (visible to everyone)
-- ==========================================

INSERT INTO exercises (user_id, name, canonical_name, primary_muscle, secondary_muscles, equipment) VALUES
  -- Chest
  (NULL, 'Bench Press', 'bench press', 'chest', '{triceps,shoulders}', 'barbell'),
  (NULL, 'Incline Bench Press', 'incline bench press', 'chest', '{triceps,shoulders}', 'barbell'),
  (NULL, 'Decline Bench Press', 'decline bench press', 'chest', '{triceps}', 'barbell'),
  (NULL, 'Dumbbell Bench Press', 'dumbbell bench press', 'chest', '{triceps,shoulders}', 'dumbbell'),
  (NULL, 'Incline Dumbbell Press', 'incline dumbbell press', 'chest', '{triceps,shoulders}', 'dumbbell'),
  (NULL, 'Dumbbell Flyes', 'dumbbell flyes', 'chest', '{}', 'dumbbell'),
  (NULL, 'Cable Flyes', 'cable flyes', 'chest', '{}', 'cable'),
  (NULL, 'Chest Dips', 'chest dips', 'chest', '{triceps,shoulders}', 'bodyweight'),
  (NULL, 'Push Ups', 'push ups', 'chest', '{triceps,shoulders}', 'bodyweight'),
  (NULL, 'Machine Chest Press', 'machine chest press', 'chest', '{triceps}', 'machine'),

  -- Back
  (NULL, 'Deadlift', 'deadlift', 'back', '{hamstrings,glutes}', 'barbell'),
  (NULL, 'Barbell Row', 'barbell row', 'back', '{biceps}', 'barbell'),
  (NULL, 'Dumbbell Row', 'dumbbell row', 'back', '{biceps}', 'dumbbell'),
  (NULL, 'Pull Ups', 'pull ups', 'back', '{biceps}', 'bodyweight'),
  (NULL, 'Chin Ups', 'chin ups', 'back', '{biceps}', 'bodyweight'),
  (NULL, 'Lat Pulldown', 'lat pulldown', 'back', '{biceps}', 'cable'),
  (NULL, 'Seated Cable Row', 'seated cable row', 'back', '{biceps}', 'cable'),
  (NULL, 'T-Bar Row', 't-bar row', 'back', '{biceps}', 'barbell'),
  (NULL, 'Face Pulls', 'face pulls', 'back', '{shoulders}', 'cable'),

  -- Shoulders
  (NULL, 'Overhead Press', 'overhead press', 'shoulders', '{triceps}', 'barbell'),
  (NULL, 'Dumbbell Shoulder Press', 'dumbbell shoulder press', 'shoulders', '{triceps}', 'dumbbell'),
  (NULL, 'Lateral Raises', 'lateral raises', 'shoulders', '{}', 'dumbbell'),
  (NULL, 'Front Raises', 'front raises', 'shoulders', '{}', 'dumbbell'),
  (NULL, 'Rear Delt Flyes', 'rear delt flyes', 'shoulders', '{back}', 'dumbbell'),
  (NULL, 'Arnold Press', 'arnold press', 'shoulders', '{triceps}', 'dumbbell'),
  (NULL, 'Upright Row', 'upright row', 'shoulders', '{biceps}', 'barbell'),

  -- Biceps
  (NULL, 'Barbell Curl', 'barbell curl', 'biceps', '{}', 'barbell'),
  (NULL, 'Dumbbell Curl', 'dumbbell curl', 'biceps', '{}', 'dumbbell'),
  (NULL, 'Hammer Curl', 'hammer curl', 'biceps', '{forearms}', 'dumbbell'),
  (NULL, 'Preacher Curl', 'preacher curl', 'biceps', '{}', 'barbell'),
  (NULL, 'Cable Curl', 'cable curl', 'biceps', '{}', 'cable'),
  (NULL, 'Incline Dumbbell Curl', 'incline dumbbell curl', 'biceps', '{}', 'dumbbell'),

  -- Triceps
  (NULL, 'Tricep Pushdown', 'tricep pushdown', 'triceps', '{}', 'cable'),
  (NULL, 'Overhead Tricep Extension', 'overhead tricep extension', 'triceps', '{}', 'cable'),
  (NULL, 'Skull Crushers', 'skull crushers', 'triceps', '{}', 'barbell'),
  (NULL, 'Close-Grip Bench Press', 'close-grip bench press', 'triceps', '{chest}', 'barbell'),
  (NULL, 'Dips', 'dips', 'triceps', '{chest,shoulders}', 'bodyweight'),
  (NULL, 'Kickbacks', 'kickbacks', 'triceps', '{}', 'dumbbell'),

  -- Legs
  (NULL, 'Squat', 'squat', 'quads', '{glutes,hamstrings}', 'barbell'),
  (NULL, 'Front Squat', 'front squat', 'quads', '{glutes}', 'barbell'),
  (NULL, 'Leg Press', 'leg press', 'quads', '{glutes}', 'machine'),
  (NULL, 'Leg Extension', 'leg extension', 'quads', '{}', 'machine'),
  (NULL, 'Leg Curl', 'leg curl', 'hamstrings', '{}', 'machine'),
  (NULL, 'Romanian Deadlift', 'romanian deadlift', 'hamstrings', '{glutes,back}', 'barbell'),
  (NULL, 'Bulgarian Split Squat', 'bulgarian split squat', 'quads', '{glutes}', 'dumbbell'),
  (NULL, 'Lunges', 'lunges', 'quads', '{glutes}', 'dumbbell'),
  (NULL, 'Hip Thrust', 'hip thrust', 'glutes', '{hamstrings}', 'barbell'),
  (NULL, 'Calf Raise', 'calf raise', 'calves', '{}', 'machine'),
  (NULL, 'Seated Calf Raise', 'seated calf raise', 'calves', '{}', 'machine'),

  -- Abs
  (NULL, 'Plank', 'plank', 'abs', '{}', 'bodyweight'),
  (NULL, 'Hanging Leg Raise', 'hanging leg raise', 'abs', '{}', 'bodyweight'),
  (NULL, 'Cable Crunch', 'cable crunch', 'abs', '{}', 'cable'),
  (NULL, 'Ab Wheel Rollout', 'ab wheel rollout', 'abs', '{}', 'other');
