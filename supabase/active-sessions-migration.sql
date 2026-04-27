-- ============================================================
-- Migration : active_sessions (Multi-Device Locking — S1.4)
-- ============================================================
-- À exécuter dans Supabase SQL Editor → Run
-- Idempotent : peut être ré-exécuté sans danger
--
-- Empêche qu'une même séance (user, date, programme, jour) soit
-- terminée simultanément depuis plusieurs appareils → doublons.
--
-- Voir : js/modules/supabase.js → acquireSessionLock / releaseSessionLock
--        js/modules/training.js  → startFullScreenSession (hook)
--
-- Postgres 15+ requis (NULLS NOT DISTINCT). Supabase utilise PG 15+.
-- ============================================================

-- 1. Table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS active_sessions (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id    TEXT NOT NULL,
    session_id   TEXT NOT NULL,
    program      TEXT,
    day          TEXT,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Contrainte UNIQUE composite avec NULLS NOT DISTINCT -------
-- Cible exactement le onConflict client : (user_id, session_date, program, day).
-- NULLS NOT DISTINCT → 2 NULL sont considérés égaux (PG 15+).
DO $$
BEGIN
    -- Drop ancienne contrainte si présente (re-run safe)
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'active_sessions_user_date_program_day_key'
    ) THEN
        ALTER TABLE active_sessions
            DROP CONSTRAINT active_sessions_user_date_program_day_key;
    END IF;

    -- Drop ancien index si présent (re-run safe)
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_active_sessions_unique_lock'
    ) THEN
        DROP INDEX idx_active_sessions_unique_lock;
    END IF;
END$$;

ALTER TABLE active_sessions
    ADD CONSTRAINT active_sessions_user_date_program_day_key
    UNIQUE NULLS NOT DISTINCT (user_id, session_date, program, day);

-- 3. Index de recherche ---------------------------------------
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_date
    ON active_sessions(user_id, session_date);

CREATE INDEX IF NOT EXISTS idx_active_sessions_device
    ON active_sessions(device_id);

-- 4. Trigger updated_at ---------------------------------------
CREATE OR REPLACE FUNCTION trigger_active_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS active_sessions_updated_at ON active_sessions;
CREATE TRIGGER active_sessions_updated_at
    BEFORE UPDATE ON active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_active_sessions_updated_at();

-- 5. RLS ------------------------------------------------------
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own active sessions"   ON active_sessions;
DROP POLICY IF EXISTS "Users insert own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users update own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users delete own active sessions" ON active_sessions;

CREATE POLICY "Users view own active sessions"
    ON active_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own active sessions"
    ON active_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own active sessions"
    ON active_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own active sessions"
    ON active_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Doc -----------------------------------------------------
COMMENT ON TABLE active_sessions IS
    'Multi-device session locks. Une ligne par (user, date, program, day). Auto-cleanup côté client recommandé pour les locks >24h orphelins.';

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- SELECT * FROM active_sessions WHERE user_id = auth.uid();
-- ============================================================
