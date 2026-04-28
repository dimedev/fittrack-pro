-- =========================================================================
-- V6.4 — Security hardening : REVOKE EXECUTE on internal functions
-- Date    : 2026-04-28
-- Context : Audit RLS + advisors cleanup pour Play Store / App Store readiness.
--
-- Findings (Supabase advisors avant migration) :
--   6 warnings "Signed-In Users Can Execute SECURITY DEFINER Function"
--     - public.cleanup_stale_session_locks()         (trigger fn, exposee REST RPC)
--     - public.update_active_sessions_updated_at()   (trigger fn, exposee REST RPC)
--     - public.save_session_atomic(jsonb, jsonb)     (RPC legitime, appel client authentifie)
--     - public.update_meal_combos_updated_at()       (trigger fn, exposee REST RPC)
--     - public.update_progress_photos_updated_at()   (trigger fn, exposee REST RPC)
--
-- Strategy :
--   - Trigger functions (4) : revoke EXECUTE pour anon, authenticated, PUBLIC.
--     Elles ne sont jamais appelees par le client, uniquement par les triggers
--     internes (qui s'executent avec les privileges du proprietaire de la table).
--   - save_session_atomic : conserver EXECUTE pour authenticated (appele depuis
--     js/modules/training.js:2759 via supabaseClient.rpc), revoke pour anon + PUBLIC.
--
-- After this migration, only 1 SECURITY DEFINER advisor warning remains :
-- save_session_atomic, which is intentional (atomic session saves require
-- privileged execution). The remaining advisor "leaked_password_protection"
-- requires manual activation in Supabase Auth Dashboard (not fixable via SQL).
-- =========================================================================

-- 1. Trigger functions : revoke EXECUTE de tous les roles applicatifs.
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_session_locks()
    FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.update_active_sessions_updated_at()
    FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.update_meal_combos_updated_at()
    FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.update_progress_photos_updated_at()
    FROM anon, authenticated, PUBLIC;

-- 2. save_session_atomic : revoke pour anon + PUBLIC, garder authenticated.
REVOKE EXECUTE ON FUNCTION public.save_session_atomic(jsonb, jsonb)
    FROM anon, PUBLIC;

-- =========================================================================
-- Verification post-migration :
--   - Advisors security : 5 warnings SECURITY DEFINER eliminees
--   - save_session_atomic : reste 1 warning (intentionnel, RPC client legitime)
--   - leaked_password_protection : warning persistant (toggle manuel Auth Dashboard)
-- =========================================================================
