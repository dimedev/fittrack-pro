-- ========================================
-- FIX POUR LES ENTRÉES EXISTANTES
-- ========================================
-- Ce script assigne le meal_type aux entrées existantes
-- basé sur l'heure à laquelle elles ont été créées (added_at)

-- IMPORTANT : Exécute ce script APRÈS avoir exécuté SUPABASE-MIGRATIONS.sql

-- Assigner le meal_type basé sur l'heure d'ajout originale
UPDATE food_journal
SET meal_type = CASE
    -- Petit-déjeuner : 5h - 11h
    WHEN EXTRACT(HOUR FROM added_at AT TIME ZONE 'UTC') >= 5 
     AND EXTRACT(HOUR FROM added_at AT TIME ZONE 'UTC') < 11 THEN 'breakfast'
    
    -- Déjeuner : 11h - 15h
    WHEN EXTRACT(HOUR FROM added_at AT TIME ZONE 'UTC') >= 11 
     AND EXTRACT(HOUR FROM added_at AT TIME ZONE 'UTC') < 15 THEN 'lunch'
    
    -- Dîner : 17h - 22h
    WHEN EXTRACT(HOUR FROM added_at AT TIME ZONE 'UTC') >= 17 
     AND EXTRACT(HOUR FROM added_at AT TIME ZONE 'UTC') < 22 THEN 'dinner'
    
    -- Collation : tout le reste
    ELSE 'snack'
END
WHERE meal_type IS NULL;

-- Afficher le résultat
SELECT 
    meal_type, 
    COUNT(*) as count 
FROM food_journal 
GROUP BY meal_type 
ORDER BY meal_type;
