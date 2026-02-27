-- ============================================================
-- FIX RLS GAPS — Tables manquantes de Row Level Security
-- À exécuter dans Supabase SQL Editor IMMÉDIATEMENT
-- Date: 2026-02-27
-- Contexte: Audit sécurité a révélé 4 tables sans RLS
-- ============================================================

-- ============================================================
-- 1. training_settings (CRITIQUE — contient wizardResults,
--    trainingProgress, sessionTemplates, goals, bodyWeightLog)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_settings') THEN
        ALTER TABLE training_settings ENABLE ROW LEVEL SECURITY;

        -- Supprimer les anciennes policies si elles existent
        DROP POLICY IF EXISTS "Users can view own training_settings" ON training_settings;
        DROP POLICY IF EXISTS "Users can insert own training_settings" ON training_settings;
        DROP POLICY IF EXISTS "Users can update own training_settings" ON training_settings;
        DROP POLICY IF EXISTS "Users can delete own training_settings" ON training_settings;

        CREATE POLICY "Users can view own training_settings"
            ON training_settings FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own training_settings"
            ON training_settings FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own training_settings"
            ON training_settings FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete own training_settings"
            ON training_settings FOR DELETE
            USING (auth.uid() = user_id);

        RAISE NOTICE 'RLS activé sur training_settings';
    ELSE
        RAISE NOTICE 'Table training_settings non trouvée — ignorée';
    END IF;
END $$;

-- ============================================================
-- 2. user_profiles (CRITIQUE — contient âge, poids, taille,
--    genre, objectifs BMR/TDEE/macros)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

        CREATE POLICY "Users can view own profile"
            ON user_profiles FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own profile"
            ON user_profiles FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own profile"
            ON user_profiles FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete own profile"
            ON user_profiles FOR DELETE
            USING (auth.uid() = user_id);

        RAISE NOTICE 'RLS activé sur user_profiles';
    ELSE
        RAISE NOTICE 'Table user_profiles non trouvée — ignorée';
    END IF;
END $$;

-- ============================================================
-- 3. custom_exercises (HIGH — exercices personnalisés)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_exercises') THEN
        ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own custom_exercises" ON custom_exercises;
        DROP POLICY IF EXISTS "Users can insert own custom_exercises" ON custom_exercises;
        DROP POLICY IF EXISTS "Users can update own custom_exercises" ON custom_exercises;
        DROP POLICY IF EXISTS "Users can delete own custom_exercises" ON custom_exercises;

        CREATE POLICY "Users can view own custom_exercises"
            ON custom_exercises FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own custom_exercises"
            ON custom_exercises FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own custom_exercises"
            ON custom_exercises FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete own custom_exercises"
            ON custom_exercises FOR DELETE
            USING (auth.uid() = user_id);

        RAISE NOTICE 'RLS activé sur custom_exercises';
    ELSE
        RAISE NOTICE 'Table custom_exercises non trouvée — ignorée';
    END IF;
END $$;

-- ============================================================
-- 4. exercise_swaps (HIGH — remplacements d'exercices)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exercise_swaps') THEN
        ALTER TABLE exercise_swaps ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own exercise_swaps" ON exercise_swaps;
        DROP POLICY IF EXISTS "Users can insert own exercise_swaps" ON exercise_swaps;
        DROP POLICY IF EXISTS "Users can update own exercise_swaps" ON exercise_swaps;
        DROP POLICY IF EXISTS "Users can delete own exercise_swaps" ON exercise_swaps;

        CREATE POLICY "Users can view own exercise_swaps"
            ON exercise_swaps FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own exercise_swaps"
            ON exercise_swaps FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own exercise_swaps"
            ON exercise_swaps FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete own exercise_swaps"
            ON exercise_swaps FOR DELETE
            USING (auth.uid() = user_id);

        RAISE NOTICE 'RLS activé sur exercise_swaps';
    ELSE
        RAISE NOTICE 'Table exercise_swaps non trouvée — ignorée';
    END IF;
END $$;

-- ============================================================
-- 5. Ajouter session_id + contrainte UNIQUE sur progress_log
--    Évite les doublons de progress_log lors des retry/reconnexion
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'progress_log') THEN
        -- Ajouter la colonne session_id si elle n'existe pas
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'progress_log' AND column_name = 'session_id'
        ) THEN
            ALTER TABLE progress_log ADD COLUMN session_id TEXT;
            RAISE NOTICE 'Colonne session_id ajoutée à progress_log';
        END IF;

        -- Créer la contrainte UNIQUE si elle n'existe pas
        IF NOT EXISTS (
            SELECT FROM pg_constraint
            WHERE conname = 'progress_log_unique_per_session'
        ) THEN
            -- Supprimer les doublons existants avant d'ajouter la contrainte
            -- Garde la ligne avec l'id le plus récent pour chaque combinaison
            DELETE FROM progress_log a
            USING progress_log b
            WHERE a.id < b.id
              AND a.user_id = b.user_id
              AND a.exercise_name = b.exercise_name
              AND a.date = b.date
              AND a.session_id IS NOT NULL
              AND a.session_id = b.session_id;

            ALTER TABLE progress_log
                ADD CONSTRAINT progress_log_unique_per_session
                UNIQUE (user_id, exercise_name, date, session_id);
            RAISE NOTICE 'Contrainte UNIQUE ajoutée sur progress_log';
        END IF;
    END IF;
END $$;

-- ============================================================
-- 6. Vérification finale — Lister le statut RLS de toutes les tables
-- ============================================================
SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;
