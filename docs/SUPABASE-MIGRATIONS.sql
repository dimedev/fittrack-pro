-- ========================================
-- MIGRATIONS SUPABASE - FITTRACK PRO
-- ========================================
-- Ces migrations ajoutent les colonnes nécessaires pour :
-- 1. Synchronisation du meal_type (breakfast, lunch, snack, dinner)
-- 2. Support des unités naturelles (unit_type, unit_count)
-- 3. Support des unités pour les aliments personnalisés

-- ========================================
-- TABLE : food_journal
-- ========================================
-- Ajouter les colonnes pour le meal_type et les unités
ALTER TABLE food_journal 
ADD COLUMN IF NOT EXISTS meal_type text,
ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'g',
ADD COLUMN IF NOT EXISTS unit_count numeric;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN food_journal.meal_type IS 'Type de repas : breakfast, lunch, snack, dinner';
COMMENT ON COLUMN food_journal.unit_type IS 'Type d''unité (g, piece, slice, tbsp, etc.)';
COMMENT ON COLUMN food_journal.unit_count IS 'Quantité en unités (ex: 2 pour 2 œufs)';

-- ========================================
-- TABLE : custom_foods
-- ========================================
-- Ajouter les colonnes pour les unités naturelles
ALTER TABLE custom_foods 
ADD COLUMN IF NOT EXISTS unit text,
ADD COLUMN IF NOT EXISTS unit_label text,
ADD COLUMN IF NOT EXISTS unit_weight numeric;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN custom_foods.unit IS 'Type d''unité (piece, slice, tbsp, etc.)';
COMMENT ON COLUMN custom_foods.unit_label IS 'Nom de l''unité en français (biscuit, tranche, cuillère)';
COMMENT ON COLUMN custom_foods.unit_weight IS 'Poids en grammes d''une unité';

-- ========================================
-- FIN DES MIGRATIONS
-- ========================================
-- Instructions :
-- 1. Va dans ton Supabase Dashboard
-- 2. Ouvre SQL Editor
-- 3. Colle ce fichier complet
-- 4. Clique "Run"
-- 5. Vérifie que tu vois "Success. No rows returned"
-- 6. Rafraîchis l'app FitTrack Pro
