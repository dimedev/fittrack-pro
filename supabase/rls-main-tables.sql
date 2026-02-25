-- ============================================================
-- RLS (Row Level Security) — Tables principales FitTrack Pro
-- ============================================================
-- À exécuter dans Supabase SQL Editor → Run
-- Chaque bloc est idempotent (IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ============================================================
-- 1. workout_sessions
-- ============================================================
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions"  ON workout_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON workout_sessions;

CREATE POLICY "Users can view own sessions"
    ON workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON workout_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON workout_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 2. progress_log
-- ============================================================
ALTER TABLE progress_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress"  ON progress_log;
DROP POLICY IF EXISTS "Users can insert own progress" ON progress_log;
DROP POLICY IF EXISTS "Users can update own progress" ON progress_log;
DROP POLICY IF EXISTS "Users can delete own progress" ON progress_log;

CREATE POLICY "Users can view own progress"
    ON progress_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON progress_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON progress_log FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
    ON progress_log FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 3. food_journal
-- ============================================================
ALTER TABLE food_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own journal"  ON food_journal;
DROP POLICY IF EXISTS "Users can insert own journal" ON food_journal;
DROP POLICY IF EXISTS "Users can update own journal" ON food_journal;
DROP POLICY IF EXISTS "Users can delete own journal" ON food_journal;

CREATE POLICY "Users can view own journal"
    ON food_journal FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal"
    ON food_journal FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal"
    ON food_journal FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal"
    ON food_journal FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 4. cardio_sessions
-- ============================================================
ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cardio"  ON cardio_sessions;
DROP POLICY IF EXISTS "Users can insert own cardio" ON cardio_sessions;
DROP POLICY IF EXISTS "Users can update own cardio" ON cardio_sessions;
DROP POLICY IF EXISTS "Users can delete own cardio" ON cardio_sessions;

CREATE POLICY "Users can view own cardio"
    ON cardio_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cardio"
    ON cardio_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cardio"
    ON cardio_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cardio"
    ON cardio_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 5. custom_foods (si pas encore fait)
-- ============================================================
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own foods"  ON custom_foods;
DROP POLICY IF EXISTS "Users can insert own foods" ON custom_foods;
DROP POLICY IF EXISTS "Users can update own foods" ON custom_foods;
DROP POLICY IF EXISTS "Users can delete own foods" ON custom_foods;

CREATE POLICY "Users can view own foods"
    ON custom_foods FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own foods"
    ON custom_foods FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foods"
    ON custom_foods FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own foods"
    ON custom_foods FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 6. user_settings / training_settings (si la table existe)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (
            SELECT FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can manage own settings'
        ) THEN
            CREATE POLICY "Users can manage own settings"
                ON user_settings FOR ALL
                USING (auth.uid() = user_id)
                WITH CHECK (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- ============================================================
-- Vérification — liste les politiques actives
-- ============================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename IN (
    'workout_sessions', 'progress_log', 'food_journal',
    'cardio_sessions', 'custom_foods', 'meal_combos', 'progress_photos'
)
ORDER BY tablename, cmd;
