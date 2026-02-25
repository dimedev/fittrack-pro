import { defineConfig } from 'vite';
import { resolve } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// FitTrack Pro — Vite config
//
// Stratégie :
//   • `vite`        → serveur de dev (sert index.html + 35 scripts séparément)
//   • `vite build`  → bundle IIFE unique  dist/fittrack-bundle.js  (~500 KB gz)
//
// Pourquoi IIFE et pas ESM ?
//   Les modules existants utilisent des globals partagées (state, saveState…)
//   sans import/export. Le format IIFE avec strict:false conserve ce
//   comportement : les variables top-level de chaque fichier sont accessibles
//   dans la portée du bundle, exactement comme avec des <script> classiques.
//
// Les CDN (Chart.js, Supabase, Dexie, Quagga) restent dans le HTML car ils
// exposent des globals et doivent être chargés avant le bundle.
//
// Tests : vitest.config.js (séparé), playwright.config.js pour E2E
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig(({ command }) => {

    if (command === 'build') {
        return {
            build: {
                lib: {
                    entry: resolve(__dirname, 'js/main.js'),
                    formats: ['iife'],
                    name: 'FitTrackPro',
                    fileName: () => 'fittrack-bundle.js'
                },
                outDir: 'dist',
                emptyOutDir: true,
                minify: 'terser',
                terserOptions: {
                    compress: {
                        drop_console: false,   // on garde les console.log en prod pour debug
                        passes: 2
                    },
                    format: {
                        comments: false        // supprime tous les commentaires
                    }
                },
                rollupOptions: {
                    output: {
                        // CRITIQUE : désactive strict mode dans l'IIFE
                        // → les globals inter-modules (state, saveState, etc.) fonctionnent
                        strict: false
                    }
                },
                // Rapport de taille dans le terminal
                reportCompressedSize: true,
                chunkSizeWarningLimit: 1500  // training.js seul fait ~200 KB
            }
        };
    }

    // ── Serveur de développement ──────────────────────────────────────────────
    return {
        root: '.',
        server: {
            port: 3000,
            open: true,
            // Pas de HMR nécessaire pour vanilla JS pur
            hmr: false
        }
    };
});
