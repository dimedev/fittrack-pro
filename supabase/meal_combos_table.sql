-- ==================== TABLE MEAL_COMBOS ====================
-- Table pour stocker les combos de repas favoris des utilisateurs
-- A executer dans le SQL Editor de Supabase

-- Table meal_combos
CREATE TABLE IF NOT EXISTS meal_combos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    combo_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '⭐',
    foods JSONB NOT NULL,
    meal_types TEXT[] NOT NULL,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, combo_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_meal_combos_user_id ON meal_combos(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_combos_last_used ON meal_combos(last_used DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_meal_combos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_meal_combos_updated_at
    BEFORE UPDATE ON meal_combos
    FOR EACH ROW
    EXECUTE FUNCTION update_meal_combos_updated_at();

-- RLS (Row Level Security)
ALTER TABLE meal_combos ENABLE ROW LEVEL SECURITY;

-- Politique : utilisateurs voient uniquement leurs propres combos
CREATE POLICY "Users can view own combos"
    ON meal_combos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own combos"
    ON meal_combos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own combos"
    ON meal_combos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own combos"
    ON meal_combos FOR DELETE
    USING (auth.uid() = user_id);
