-- Migration: Ajouter la colonne sets_detail à progress_log
-- Date: 2026-01-30
-- Description: Permet de sauvegarder les détails de chaque série pour améliorer 
--              le calcul du 1RM, des recommandations du coach, et l'affichage des records

-- Ajouter la colonne sets_detail (JSONB pour performance et requêtage)
ALTER TABLE progress_log 
ADD COLUMN IF NOT EXISTS sets_detail JSONB;

-- Ajouter un index GIN pour requêtes JSON rapides (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_progress_log_sets_detail 
ON progress_log USING GIN (sets_detail);

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN progress_log.sets_detail IS 
'Détails des séries: tableau JSON avec setNumber, weight, reps, completed pour chaque série';

-- Exemple de structure attendue dans sets_detail:
-- [
--   {"setNumber": 1, "weight": 80, "reps": 10, "completed": true},
--   {"setNumber": 2, "weight": 80, "reps": 9, "completed": true},
--   {"setNumber": 3, "weight": 80, "reps": 8, "completed": true}
-- ]

-- Notes:
-- - Les anciennes données n'auront pas de sets_detail (NULL)
-- - L'application gère ce cas avec un fallback sur les données agrégées (sets, weight, achievedReps)
-- - Toutes les nouvelles séances incluront automatiquement sets_detail
