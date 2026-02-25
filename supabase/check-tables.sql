-- Vérifier quelles tables existent dans public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('workout_sessions', 'progress_log', 'food_journal', 'cardio_sessions', 'custom_foods', 'meal_combos', 'progress_photos', 'user_settings')
ORDER BY table_name;
