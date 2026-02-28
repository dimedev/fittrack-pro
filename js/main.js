/**
 * FitTrack Pro — Point d'entrée unique (bundle de production)
 *
 * Ce fichier est utilisé UNIQUEMENT par `vite build` pour produire
 * dist/fittrack-bundle.js (un seul fichier IIFE minifié).
 *
 * En développement, index.html charge toujours les 35 fichiers séparément
 * (plus rapide, débogage plus aisé).
 *
 * ⚠️  Ordre d'import = ordre d'exécution.
 *     Respecter scrupuleusement l'ordre des <script> dans index.html.
 *
 * Les dépendances CDN (Chart.js, Supabase, Dexie, Quagga, Sentry) sont
 * exclues : elles restent dans les <script> CDN du HTML et exposent
 * leurs globals (Chart, supabase, Dexie, Quagga, Sentry) avant ce bundle.
 */

// ── Service Registry (doit être chargé en premier) ──────────────────────────
import './modules/services.js';

// ── Données statiques ────────────────────────────────────────────────────────
import './data/foods.js';
import './data/exercises.js';
import './data/programs.js';

// ── Modules cœur ─────────────────────────────────────────────────────────────
import './modules/database.js';
import './modules/state.js';
import './modules/haptic.js';

// ── Modules secondaires ──────────────────────────────────────────────────────
import './modules/barcode-scanner.js';
import './modules/meal-history.js';
import './modules/recipes.js';
import './modules/icons.js';

// ── Sync & profil ─────────────────────────────────────────────────────────────
import './modules/supabase.js';
import './modules/profile.js';

// ── Nutrition ────────────────────────────────────────────────────────────────
import './modules/nutrition-core.js';
import './modules/nutrition-ui.js';
import './modules/nutrition.js';
import './modules/food-api.js';
import './modules/nutrition-suggestions.js';
import './modules/meal-templates.js';

// ── Cardio ───────────────────────────────────────────────────────────────────
import './modules/cardio.js';

// ── Entraînement ─────────────────────────────────────────────────────────────
import './modules/training-shared.js';
import './modules/training-periodization.js';
import './modules/training-wizard.js';
import './modules/training-swap.js';
import './modules/training-builder.js';
import './modules/training.js';
import './modules/session-manager.js';
import './modules/session-ui.js';

// ── Progress & stats ──────────────────────────────────────────────────────────
import './modules/progress.js';
import './modules/achievements.js';
import './modules/smart-training.js';

// ── Santé & intégrations ─────────────────────────────────────────────────────
import './modules/health-integration.js';
import './modules/audio-feedback.js';
import './modules/timer.js';

// ── UI & utilitaires ─────────────────────────────────────────────────────────
import './modules/ui.js';
import './modules/goals.js';
import './modules/photos.js';
import './modules/premium-ui.js';
import './modules/hydration.js';
import './modules/plate-calculator.js';
import './modules/mobile-gestures.js';
import './modules/theme.js';

// ── Initialisation principale (doit être en dernier) ─────────────────────────
import './app.js';
