-- ========================================
-- TABLE HYDRATATION - FITTRACK PRO
-- ========================================
-- Cette table stocke le suivi d'hydratation quotidien

-- Créer la table hydration_log
CREATE TABLE IF NOT EXISTS hydration_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    date date NOT NULL,
    amount_ml integer NOT NULL CHECK (amount_ml >= 0 AND amount_ml <= 10000),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, date)
);

-- Ajouter un commentaire
COMMENT ON TABLE hydration_log IS 'Suivi quotidien de l''hydratation en millilitres';
COMMENT ON COLUMN hydration_log.amount_ml IS 'Quantité d''eau consommée en ml (0-10000)';

-- Activer RLS (Row Level Security)
ALTER TABLE hydration_log ENABLE ROW LEVEL SECURITY;

-- Politique : chaque utilisateur gère uniquement ses propres données
CREATE POLICY "Users can manage their own hydration"
    ON hydration_log FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_hydration_user_date ON hydration_log(user_id, date DESC);

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================
-- Instructions :
-- 1. Va dans Supabase Dashboard → SQL Editor
-- 2. Colle ce script complet
-- 3. Clique "Run"
-- 4. Vérifie que tu vois "Success. No rows returned"
-- 5. Rafraîchis l'app FitTrack Pro
