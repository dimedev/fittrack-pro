-- ============================================================
-- RLS pour les tables qui n'ont pas encore de politiques
-- Exécuter dans Supabase SQL Editor après avoir vérifié que les tables existent
-- ============================================================

-- 3. food_journal
ALTER TABLE food_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own journal"   ON food_journal;
DROP POLICY IF EXISTS "Users can insert own journal" ON food_journal;
DROP POLICY IF EXISTS "Users can update own journal" ON food_journal;
DROP POLICY IF EXISTS "Users can delete own journal" ON food_journal;
CREATE POLICY "Users can view own journal"   ON food_journal FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal" ON food_journal FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal" ON food_journal FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal" ON food_journal FOR DELETE USING (auth.uid() = user_id);

-- 4. cardio_sessions
ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own cardio"   ON cardio_sessions;
DROP POLICY IF EXISTS "Users can insert own cardio" ON cardio_sessions;
DROP POLICY IF EXISTS "Users can update own cardio" ON cardio_sessions;
DROP POLICY IF EXISTS "Users can delete own cardio" ON cardio_sessions;
CREATE POLICY "Users can view own cardio"   ON cardio_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cardio" ON cardio_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cardio" ON cardio_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own cardio" ON cardio_sessions FOR DELETE USING (auth.uid() = user_id);

-- 5. custom_foods
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own foods"   ON custom_foods;
DROP POLICY IF EXISTS "Users can insert own foods" ON custom_foods;
DROP POLICY IF EXISTS "Users can update own foods" ON custom_foods;
DROP POLICY IF EXISTS "Users can delete own foods" ON custom_foods;
CREATE POLICY "Users can view own foods"   ON custom_foods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own foods" ON custom_foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own foods" ON custom_foods FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own foods" ON custom_foods FOR DELETE USING (auth.uid() = user_id);
