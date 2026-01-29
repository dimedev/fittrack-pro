-- ========================================
-- MIGRATION SESSION DEDUPLICATION
-- FitTrack Pro - Fix Session Duplication Bug
-- ========================================

-- ÉTAPE 1: Ajouter les nouvelles colonnes
-- ========================================

-- Ajouter session_id (UUID unique pour idempotence)
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS session_id text;

-- Ajouter duration (minutes)
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0;

-- Ajouter total_volume (kg)
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS total_volume integer DEFAULT 0;

-- Ajouter calories_burned
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS calories_burned integer DEFAULT 0;

-- ========================================
-- ÉTAPE 2: Générer des session_id pour les sessions existantes
-- ========================================

-- Pour les sessions sans session_id, en générer un basé sur user_id + created_at
UPDATE workout_sessions 
SET session_id = 'legacy-' || id::text
WHERE session_id IS NULL;

-- ========================================
-- ÉTAPE 3: Identifier et supprimer les doublons
-- ========================================

-- Vue temporaire pour identifier les doublons
-- (même user, date, program, day_name)
CREATE TEMP TABLE duplicate_sessions AS
SELECT 
    user_id,
    date,
    program,
    day_name,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY created_at ASC) as session_ids,
    MIN(created_at) as first_created
FROM workout_sessions
GROUP BY user_id, date, program, day_name
HAVING COUNT(*) > 1;

-- Afficher le nombre de sessions dupliquées
SELECT 
    COUNT(*) as nombre_groupes_dupliques,
    SUM(count - 1) as nombre_sessions_a_supprimer
FROM duplicate_sessions;

-- Supprimer les doublons (garder la plus ancienne)
DELETE FROM workout_sessions
WHERE id IN (
    SELECT unnest(session_ids[2:]) 
    FROM duplicate_sessions
);

-- Nettoyer la vue temporaire
DROP TABLE IF EXISTS duplicate_sessions;

-- ========================================
-- ÉTAPE 4: Créer l'index unique
-- ========================================

-- Index unique sur user_id + session_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_user_session 
ON workout_sessions(user_id, session_id);

-- Index pour requêtes par date
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date 
ON workout_sessions(user_id, date DESC);

-- ========================================
-- ÉTAPE 5: Vérification
-- ========================================

-- Afficher le résultat final
SELECT 
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id) as total_users
FROM workout_sessions;

-- Vérifier qu'il n'y a plus de doublons
SELECT 
    user_id,
    date,
    program,
    day_name,
    COUNT(*) as count
FROM workout_sessions
GROUP BY user_id, date, program, day_name
HAVING COUNT(*) > 1;

-- Si résultat vide = SUCCESS ✅

-- ========================================
-- ROLLBACK (EN CAS D'ERREUR)
-- ========================================

-- ATTENTION: Exécuter uniquement si besoin de rollback
-- DROP INDEX IF EXISTS idx_workout_sessions_user_session;
-- DROP INDEX IF EXISTS idx_workout_sessions_date;
-- ALTER TABLE workout_sessions DROP COLUMN IF EXISTS session_id;
-- ALTER TABLE workout_sessions DROP COLUMN IF EXISTS duration;
-- ALTER TABLE workout_sessions DROP COLUMN IF EXISTS total_volume;
-- ALTER TABLE workout_sessions DROP COLUMN IF EXISTS calories_burned;

-- ========================================
-- INSTRUCTIONS
-- ========================================
-- 1. Ouvrir Supabase Dashboard → SQL Editor
-- 2. Copier/coller ce script
-- 3. Exécuter (Run)
-- 4. Vérifier les résultats de l'étape 5
-- 5. Rafraîchir l'application FitTrack Pro
