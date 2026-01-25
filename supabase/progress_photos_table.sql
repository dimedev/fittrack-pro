-- ==================== TABLE PROGRESS_PHOTOS ====================
-- Table pour stocker les métadonnées des photos de progression
-- Le bucket Storage "progress-photos" doit être créé manuellement dans Supabase Dashboard
-- A exécuter dans le SQL Editor de Supabase

-- Table progress_photos
CREATE TABLE IF NOT EXISTS progress_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    photo_path TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    taken_at DATE NOT NULL,
    weight DECIMAL(5,2),
    body_fat DECIMAL(4,1),
    pose TEXT NOT NULL DEFAULT 'front',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_taken_at ON progress_photos(taken_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_progress_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_progress_photos_updated_at ON progress_photos;
CREATE TRIGGER trigger_progress_photos_updated_at
    BEFORE UPDATE ON progress_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_progress_photos_updated_at();

-- RLS (Row Level Security) pour la table
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Policies pour la table progress_photos
CREATE POLICY "Users can view own photos"
    ON progress_photos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
    ON progress_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos"
    ON progress_photos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
    ON progress_photos FOR DELETE
    USING (auth.uid() = user_id);

-- ==================== POLICIES STORAGE ====================
-- Ces policies s'appliquent au bucket "progress-photos"
-- Structure des fichiers: {user_id}/{date}_{pose}_{timestamp}.jpg

-- Policy: Les utilisateurs peuvent uploader dans leur propre dossier
CREATE POLICY "Users can upload own progress photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'progress-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Les utilisateurs peuvent voir leurs propres photos
CREATE POLICY "Users can view own progress photos"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'progress-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Les utilisateurs peuvent supprimer leurs propres photos
CREATE POLICY "Users can delete own progress photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'progress-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
