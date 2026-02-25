/**
 * scripts/patch-html.js
 *
 * Post-build : génère dist/index.html depuis index.html en remplaçant
 * les 35 balises <script src="js/..."> par un seul bundle minifié.
 *
 * Utilisation : node scripts/patch-html.js  (appelé par npm run build)
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const SRC_HTML = path.join(ROOT, 'index.html');
const DST_HTML = path.join(ROOT, 'dist', 'index.html');

// ── Lire l'HTML source ────────────────────────────────────────────────────────
let html = fs.readFileSync(SRC_HTML, 'utf8');

// ── Supprimer le bloc "Scripts" (35 fichiers locaux) ─────────────────────────
// On cible tout ce qui se trouve entre le commentaire "<!-- Scripts -->"
// et la fin du </body>.
const SCRIPTS_BLOCK_RE =
    /[ \t]*<!-- Scripts -->[\s\S]*?(<\/body>)/;

if (!SCRIPTS_BLOCK_RE.test(html)) {
    console.error('❌  Bloc <!-- Scripts --> introuvable dans index.html');
    process.exit(1);
}

html = html.replace(
    SCRIPTS_BLOCK_RE,
    `    <!-- Bundle de production (généré par vite build) -->
    <script src="fittrack-bundle.js"></script>
$1`
);

// ── Écrire dist/index.html ────────────────────────────────────────────────────
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(DST_HTML, html, 'utf8');

// ── Rapport + objectif taille (< 300 KB) ──────────────────────────────────────
const bundlePath = path.join(ROOT, 'dist', 'fittrack-bundle.js');
const bundleSize = fs.statSync(bundlePath).size;
const kb = (bundleSize / 1024).toFixed(1);
const targetKb = 300;
console.log(`✅  dist/index.html généré`);
console.log(`📦  fittrack-bundle.js  →  ${kb} KB`);
if (bundleSize > targetKb * 1024) {
    console.warn(`⚠️  Objectif perf : bundle < ${targetKb} KB (actuel: ${kb} KB). Envisager code-splitting ou tree-shaking.`);
}
