/**
 * Script d'import des GIFs d'exercices depuis Kaggle vers Supabase
 *
 * Usage:
 *   1. Télécharger le dataset Kaggle: https://www.kaggle.com/datasets/edoardoba/fitness-exercises-with-animations
 *   2. Extraire dans ./kaggle-gifs/
 *   3. Créer un fichier .env avec SUPABASE_URL et SUPABASE_SERVICE_KEY
 *   4. npm install @supabase/supabase-js sharp dotenv
 *   5. node scripts/import-exercise-gifs.js
 */

const fs = require('fs');
const path = require('path');
const { fittrackToKaggle } = require('./exercise-gif-mapping.js');

// Configuration
const KAGGLE_DIR = path.join(__dirname, '../kaggle-gifs');
const OUTPUT_DIR = path.join(__dirname, '../temp-webp');
const BUCKET_NAME = 'exercise-gifs';
const MAX_WIDTH = 400;
const WEBP_QUALITY = 80;

// Couleurs pour le terminal
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
    log('\n🏋️ FitTrack Pro - Import GIFs Exercices\n', 'cyan');

    // Vérifier si sharp est installé
    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        log('❌ sharp non installé. Exécutez: npm install sharp', 'red');
        process.exit(1);
    }

    // Vérifier le dossier Kaggle
    if (!fs.existsSync(KAGGLE_DIR)) {
        log(`\n📥 Dossier Kaggle non trouvé: ${KAGGLE_DIR}`, 'yellow');
        log('\nInstructions:', 'cyan');
        log('1. Allez sur https://www.kaggle.com/datasets/edoardoba/fitness-exercises-with-animations');
        log('2. Téléchargez le dataset (bouton Download)');
        log('3. Extrayez le contenu dans: ' + KAGGLE_DIR);
        log('4. Relancez ce script\n');

        // Créer le dossier pour aider l'utilisateur
        fs.mkdirSync(KAGGLE_DIR, { recursive: true });
        log(`✅ Dossier créé: ${KAGGLE_DIR}`, 'green');
        process.exit(0);
    }

    // Lister les fichiers GIF disponibles
    const gifFiles = fs.readdirSync(KAGGLE_DIR)
        .filter(f => f.endsWith('.gif'))
        .map(f => f.replace('.gif', ''));

    log(`📂 ${gifFiles.length} GIFs trouvés dans Kaggle dataset`, 'green');

    // Créer le dossier de sortie
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Traiter les GIFs
    const results = {
        success: [],
        notFound: [],
        errors: []
    };

    const totalExercises = Object.keys(fittrackToKaggle).length;
    let processed = 0;

    log(`\n🔄 Conversion de ${totalExercises} exercices...\n`, 'cyan');

    for (const [fittrackId, kaggleName] of Object.entries(fittrackToKaggle)) {
        processed++;
        const progress = `[${processed}/${totalExercises}]`;

        // Chercher le fichier GIF correspondant
        const matchingFile = gifFiles.find(f =>
            f.toLowerCase() === kaggleName.toLowerCase() ||
            f.toLowerCase().replace(/_/g, '-') === kaggleName.toLowerCase().replace(/_/g, '-')
        );

        if (!matchingFile) {
            log(`${progress} ⚠️  ${fittrackId}: GIF non trouvé (${kaggleName})`, 'yellow');
            results.notFound.push({ fittrackId, kaggleName });
            continue;
        }

        const inputPath = path.join(KAGGLE_DIR, `${matchingFile}.gif`);
        const outputPath = path.join(OUTPUT_DIR, `${fittrackId}.webp`);

        try {
            // Conversion GIF -> WebP animé avec sharp
            await sharp(inputPath, { animated: true })
                .resize({ width: MAX_WIDTH, withoutEnlargement: true })
                .webp({ quality: WEBP_QUALITY, effort: 4 })
                .toFile(outputPath);

            const stats = fs.statSync(outputPath);
            const sizeKB = Math.round(stats.size / 1024);

            log(`${progress} ✅ ${fittrackId} (${sizeKB}KB)`, 'green');
            results.success.push({ fittrackId, sizeKB });

        } catch (error) {
            log(`${progress} ❌ ${fittrackId}: ${error.message}`, 'red');
            results.errors.push({ fittrackId, error: error.message });
        }
    }

    // Résumé
    log('\n' + '='.repeat(50), 'cyan');
    log('📊 RÉSUMÉ', 'cyan');
    log('='.repeat(50), 'cyan');
    log(`✅ Succès:     ${results.success.length}`, 'green');
    log(`⚠️  Non trouvé: ${results.notFound.length}`, 'yellow');
    log(`❌ Erreurs:    ${results.errors.length}`, 'red');

    if (results.success.length > 0) {
        const totalSize = results.success.reduce((acc, r) => acc + r.sizeKB, 0);
        log(`\n📦 Taille totale: ${Math.round(totalSize / 1024 * 10) / 10} MB`, 'dim');
        log(`📁 Fichiers dans: ${OUTPUT_DIR}`, 'dim');
    }

    // Générer le fichier de mapping final (pour référence)
    const mappingOutput = {
        generated: new Date().toISOString(),
        success: results.success.map(r => r.fittrackId),
        notFound: results.notFound.map(r => r.fittrackId),
        errors: results.errors.map(r => r.fittrackId)
    };

    fs.writeFileSync(
        path.join(__dirname, 'import-results.json'),
        JSON.stringify(mappingOutput, null, 2)
    );
    log(`\n📝 Résultats sauvegardés dans: scripts/import-results.json`, 'dim');

    // Instructions pour upload Supabase
    if (results.success.length > 0) {
        log('\n' + '='.repeat(50), 'cyan');
        log('📤 PROCHAINE ÉTAPE: Upload vers Supabase', 'cyan');
        log('='.repeat(50), 'cyan');
        log('\nOption 1 - Via Dashboard Supabase:', 'yellow');
        log('1. Allez sur https://supabase.com/dashboard');
        log('2. Storage > Créer bucket "exercise-gifs" (public)');
        log(`3. Uploadez tous les fichiers de: ${OUTPUT_DIR}`);

        log('\nOption 2 - Via script (nécessite .env):', 'yellow');
        log('node scripts/upload-to-supabase.js');
    }

    log('\n');
}

main().catch(console.error);
