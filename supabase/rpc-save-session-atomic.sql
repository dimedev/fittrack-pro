-- ============================================================
-- RPC : save_session_atomic
-- Sauvegarde une séance + ses progress logs en UNE transaction
-- Élimine le risque de données incohérentes (session sans logs)
-- Date: 2026-02-27
-- ============================================================

CREATE OR REPLACE FUNCTION save_session_atomic(
    p_session JSONB,
    p_progress_logs JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_session_id TEXT;
    v_log JSONB;
    v_result JSONB;
BEGIN
    -- Vérifier l'authentification
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié';
    END IF;

    -- Extraire le session_id
    v_session_id := p_session->>'session_id';
    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'session_id manquant';
    END IF;

    -- ══════════════════════════════════════════════
    -- ÉTAPE 1 : UPSERT de la séance
    -- ══════════════════════════════════════════════
    INSERT INTO workout_sessions (
        user_id,
        session_id,
        date,
        session_type,
        session_name,
        program,
        day,
        exercises,
        duration,
        total_volume,
        calories_burned,
        created_at
    ) VALUES (
        v_user_id,
        v_session_id,
        (p_session->>'date')::DATE,
        COALESCE(p_session->>'session_type', 'program'),
        p_session->>'session_name',
        p_session->>'program',
        p_session->>'day',
        COALESCE(p_session->'exercises', '[]'::JSONB),
        COALESCE((p_session->>'duration')::NUMERIC, 0),
        COALESCE((p_session->>'total_volume')::NUMERIC, 0),
        COALESCE((p_session->>'calories_burned')::NUMERIC, 0),
        NOW()
    )
    ON CONFLICT (user_id, session_id) DO UPDATE SET
        exercises = EXCLUDED.exercises,
        duration = EXCLUDED.duration,
        total_volume = EXCLUDED.total_volume,
        calories_burned = EXCLUDED.calories_burned;

    -- ══════════════════════════════════════════════
    -- ÉTAPE 2 : UPSERT de chaque progress log
    -- ══════════════════════════════════════════════
    FOR v_log IN SELECT * FROM jsonb_array_elements(p_progress_logs)
    LOOP
        INSERT INTO progress_log (
            user_id,
            exercise_name,
            date,
            session_id,
            sets,
            reps,
            weight,
            achieved_reps,
            achieved_sets,
            sets_detail
        ) VALUES (
            v_user_id,
            v_log->>'exercise_name',
            (v_log->>'date')::DATE,
            v_session_id,
            COALESCE((v_log->>'sets')::INTEGER, 0),
            COALESCE((v_log->>'reps')::INTEGER, 0),
            COALESCE((v_log->>'weight')::NUMERIC, 0),
            COALESCE((v_log->>'achieved_reps')::INTEGER, 0),
            COALESCE((v_log->>'achieved_sets')::INTEGER, 0),
            COALESCE(v_log->'sets_detail', '[]'::JSONB)
        )
        ON CONFLICT (user_id, exercise_name, date, session_id) DO UPDATE SET
            sets = EXCLUDED.sets,
            reps = EXCLUDED.reps,
            weight = EXCLUDED.weight,
            achieved_reps = EXCLUDED.achieved_reps,
            achieved_sets = EXCLUDED.achieved_sets,
            sets_detail = EXCLUDED.sets_detail;
    END LOOP;

    -- Retourner le résultat
    v_result := jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'progress_logs_count', jsonb_array_length(p_progress_logs)
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- La transaction est automatiquement rollback
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'session_id', v_session_id
        );
END;
$$;

-- Autoriser les utilisateurs authentifiés à appeler cette fonction
GRANT EXECUTE ON FUNCTION save_session_atomic(JSONB, JSONB) TO authenticated;
