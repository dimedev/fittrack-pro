/**
 * Upload des WebP vers Supabase Storage
 *
 * Prérequis:
 *   1. Avoir exécuté import-exercise-gifs.js d'abord
 *   2. Créer un fichier .env avec:
 *      SUPABASE_URL=https://xxx.supabase.co
 *      SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
 *   3. npm install @supabase/supabase-js dotenv
 *
 * Usage: node scripts/upload-to-supabase.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const WEBP_DIR = path.join(__dirname, '../temp-webp');
const BUCKET_NAME = 'exercise-gifs';

// Couleurs
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
    log('\n📤 Upload vers Supabase Storage\n', 'cyan');

    // Charger dotenv
    try {
        require('dotenv').config({ path: path.join(__dirname, '../.env') });
    } catch (e) {
        log('⚠️  dotenv non installé, utilisation des variables d\'environnement système', 'yellow');
    }

    // Vérifier les variables d'environnement
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('❌ Variables d\'environnement manquantes!', 'red');
        log('\nCréez un fichier .env à la racine du projet avec:', 'yellow');
        log('SUPABASE_URL=https://votre-projet.supabase.co');
        log('SUPABASE_SERVICE_KEY=votre_service_key');
        log('\n(Trouvez ces valeurs dans Supabase Dashboard > Settings > API)\n');
        process.exit(1);
    }

    // Charger Supabase
    let createClient;
    try {
        createClient = require('@supabase/supabase-js').createClient;
    } catch (e) {
        log('❌ @supabase/supabase-js non installé', 'red');
        log('Exécutez: npm install @supabase/supabase-js', 'yellow');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier le dossier source
    if (!fs.existsSync(WEBP_DIR)) {
        log(`❌ Dossier WebP non trouvé: ${WEBP_DIR}`, 'red');
        log('Exécutez d\'abord: node scripts/import-exercise-gifs.js', 'yellow');
        process.exit(1);
    }

    // Lister les fichiers WebP
    const webpFiles = fs.readdirSync(WEBP_DIR).filter(f => f.endsWith('.webp'));

    if (webpFiles.length === 0) {
        log('❌ Aucun fichier WebP trouvé', 'red');
        process.exit(1);
    }

    log(`📂 ${webpFiles.length} fichiers WebP à uploader\n`, 'green');

    // Vérifier/créer le bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
        log(`📁 Création du bucket "${BUCKET_NAME}"...`, 'cyan');
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/webp', 'image/gif']
        });
        if (error) {
            log(`❌ Erreur création bucket: ${error.message}`, 'red');
            process.exit(1);
        }
        log('✅ Bucket créé\n', 'green');
    }

    // Upload des fichiers
    const results = { success: 0, errors: [] };

    for (let i = 0; i < webpFiles.length; i++) {
        const filename = webpFiles[i];
        const filePath = path.join(WEBP_DIR, filename);
        const fileBuffer = fs.readFileSync(filePath);

        const progress = `[${i + 1}/${webpFiles.length}]`;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filename, fileBuffer, {
                contentType: 'image/webp',
                cacheControl: '31536000', // 1 an de cache
                upsert: true
            });

        if (error) {
            log(`${progress} ❌ ${filename}: ${error.message}`, 'red');
            results.errors.push({ filename, error: error.message });
        } else {
            log(`${progress} ✅ ${filename}`, 'green');
            results.success++;
        }

        // Petit délai pour éviter le rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    // Résumé
    log('\n' + '='.repeat(50), 'cyan');
    log('📊 RÉSUMÉ UPLOAD', 'cyan');
    log('='.repeat(50), 'cyan');
    log(`✅ Uploadés: ${results.success}`, 'green');
    log(`❌ Erreurs:  ${results.errors.length}`, results.errors.length > 0 ? 'red' : 'green');

    if (results.success > 0) {
        const exampleFile = webpFiles[0];
        log(`\n🔗 URL exemple:`, 'cyan');
        log(`${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${exampleFile}`, 'dim');
    }

    log('\n✨ Upload terminé!\n', 'green');
}

main().catch(console.error);
