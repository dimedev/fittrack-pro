/**
 * Mapping des exercices FitTrack vers les noms de fichiers GIF Kaggle
 * Dataset: https://www.kaggle.com/datasets/edoardoba/fitness-exercises-with-animations
 * Licence: CC0 (Domaine Public)
 */

// Mapping FitTrack ID -> Kaggle filename (sans extension)
const fittrackToKaggle = {
    // ==================== PECTORAUX ====================
    'bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
    'bench-press-db': 'Dumbbell_Bench_Press',
    'incline-bench': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
    'incline-bench-db': 'Incline_Dumbbell_Press',
    'decline-bench': 'Decline_Barbell_Bench_Press',
    'chest-press-machine': 'Machine_Bench_Press',
    'smith-bench': 'Smith_Machine_Bench_Press',
    'dips-chest': 'Dips_-_Chest_Version',
    'chest-fly-db': 'Dumbbell_Flyes',
    'chest-fly-cable': 'Cable_Crossover',
    'cable-crossover': 'Cable_Crossover',
    'pec-deck': 'Butterfly',
    'pullover': 'Bent-Arm_Dumbbell_Pullover',
    'push-ups': 'Pushups',
    'push-ups-incline': 'Incline_Push-Up',
    'push-ups-decline': 'Decline_Push-Up',

    // ==================== DOS ====================
    'deadlift': 'Barbell_Deadlift',
    'pull-ups': 'Pullups',
    'pull-ups-weighted': 'Pullups',
    'chin-ups': 'Chin-Up',
    'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
    'lat-pulldown-close': 'Close-Grip_Front_Lat_Pulldown',
    'lat-pulldown-vbar': 'V-Bar_Pulldown',
    'bent-over-row': 'Bent_Over_Barbell_Row',
    'bent-over-row-db': 'One-Arm_Dumbbell_Row',
    'tbar-row': 'T-Bar_Row',
    'seated-cable-row': 'Seated_Cable_Rows',
    'chest-supported-row': 'Incline_Dumbbell_Row',
    'machine-row': 'Seated_Cable_Rows',
    'straight-arm-pulldown': 'Straight-Arm_Pulldown',
    'hyperextension': 'Hyperextensions_(Back_Extensions)',

    // ==================== EPAULES ====================
    'overhead-press': 'Standing_Military_Press',
    'overhead-press-db': 'Standing_Dumbbell_Press',
    'arnold-press': 'Arnold_Dumbbell_Press',
    'shoulder-press-machine': 'Machine_Shoulder_(Military)_Press',
    'smith-shoulder-press': 'Smith_Machine_Overhead_Shoulder_Press',
    'push-press': 'Push_Press',
    'lateral-raise': 'Side_Lateral_Raise',
    'lateral-raise-cable': 'Cable_Lateral_Raise',
    'front-raise': 'Front_Dumbbell_Raise',
    'front-raise-cable': 'Cable_Front_Raise',
    'upright-row': 'Upright_Barbell_Row',

    // ==================== EPAULES ARRIERE ====================
    'face-pull': 'Face_Pull',
    'reverse-fly': 'Bent_Over_Low-Pulley_Side_Lateral',
    'reverse-fly-machine': 'Reverse_Machine_Flyes',
    'rear-delt-row': 'Rear_Delt_Row',

    // ==================== TRICEPS ====================
    'dips-triceps': 'Dips_-_Triceps_Version',
    'close-grip-bench': 'Close-Grip_Barbell_Bench_Press',
    'skull-crusher': 'Lying_Triceps_Press',
    'tricep-pushdown': 'Triceps_Pushdown',
    'tricep-pushdown-rope': 'Triceps_Pushdown_-_Rope_Attachment',
    'tricep-pushdown-vbar': 'Triceps_Pushdown_-_V-Bar_Attachment',
    'overhead-tricep': 'Cable_Overhead_Triceps_Extension',
    'overhead-tricep-db': 'Dumbbell_One-Arm_Triceps_Extension',
    'kickback': 'Tricep_Dumbbell_Kickback',
    'diamond-pushups': 'Close-Grip_Push-Up',

    // ==================== BICEPS ====================
    'barbell-curl': 'Barbell_Curl',
    'ez-curl': 'EZ-Bar_Curl',
    'dumbbell-curl': 'Dumbbell_Bicep_Curl',
    'alternating-curl': 'Alternate_Dumbbell_Curl',
    'hammer-curl': 'Hammer_Curls',
    'incline-curl': 'Incline_Dumbbell_Curl',
    'concentration-curl': 'Concentration_Curls',
    'preacher-curl': 'Preacher_Curl',
    'preacher-curl-db': 'One_Arm_Dumbbell_Preacher_Curl',
    'cable-curl': 'Cable_Curl',
    'spider-curl': 'Spider_Curl',
    'drag-curl': 'Drag_Curl',

    // ==================== QUADRICEPS ====================
    'squat': 'Barbell_Full_Squat',
    'front-squat': 'Front_Barbell_Squat',
    'goblet-squat': 'Goblet_Squat',
    'smith-squat': 'Smith_Machine_Squat',
    'hack-squat': 'Hack_Squat',
    'leg-press': 'Leg_Press',
    'leg-extension': 'Leg_Extensions',
    'lunge': 'Dumbbell_Lunges',
    'walking-lunge': 'Barbell_Walking_Lunge',
    'bulgarian-split-squat': 'Bulgarian_Split_Squat',
    'step-up': 'Dumbbell_Step_Ups',

    // ==================== ISCHIO-JAMBIERS ====================
    'rdl': 'Romanian_Deadlift',
    'rdl-db': 'Romanian_Deadlift_With_Dumbbells',
    'stiff-leg-deadlift': 'Stiff-Legged_Barbell_Deadlift',
    'good-morning': 'Good_Morning',
    'leg-curl-lying': 'Lying_Leg_Curls',
    'leg-curl-seated': 'Seated_Leg_Curl',

    // ==================== FESSIERS ====================
    'hip-thrust': 'Barbell_Hip_Thrust',
    'glute-bridge': 'Glute_Bridge',
    'cable-kickback': 'Cable_Kickback',
    'sumo-deadlift': 'Sumo_Deadlift',
    'sumo-squat': 'Sumo_Squat',

    // ==================== MOLLETS ====================
    'standing-calf': 'Standing_Calf_Raises',
    'standing-calf-smith': 'Smith_Machine_Calf_Raise',
    'seated-calf': 'Seated_Calf_Raise',
    'leg-press-calf': 'Calf_Press_On_The_Leg_Press_Machine',
    'donkey-calf': 'Donkey_Calf_Raises',

    // ==================== TRAPEZES ====================
    'barbell-shrug': 'Barbell_Shrug',
    'dumbbell-shrug': 'Dumbbell_Shrug',
    'farmers-walk': 'Farmer\'s_Walk',

    // ==================== ABDOMINAUX ====================
    'crunch': 'Crunches',
    'crunch-machine': 'Ab_Crunch_Machine',
    'cable-crunch': 'Cable_Crunch',
    'leg-raise': 'Flat_Bench_Lying_Leg_Raise',
    'hanging-leg-raise': 'Hanging_Leg_Raise',
    'plank': 'Plank',
    'side-plank': 'Side_Plank',
    'russian-twist': 'Russian_Twist',
    'ab-wheel': 'Ab_Roller',
    'dead-bug': 'Dead_Bug',
    'mountain-climber': 'Mountain_Climbers',
    'decline-crunch': 'Decline_Crunch',

    // ==================== AVANT-BRAS ====================
    'wrist-curl': 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench',
    'reverse-wrist-curl': 'Palms-Down_Wrist_Curl_Over_A_Bench',
    'reverse-curl': 'Reverse_Barbell_Curl'
};

// Exercices sans équivalent Kaggle connu (utiliseront fallback image/emoji)
const noKaggleMatch = [
    'chest-press-incline-machine',
    'smith-incline',
    'meadows-row',
    'pullover-cable',
    'lateral-raise-machine',
    'front-raise-plate',
    'reverse-fly-cable',
    'skull-crusher-db',
    'kickback-cable',
    'tricep-machine',
    'cable-curl-high',
    'machine-curl',
    'leg-press-feet-low',
    'sissy-squat',
    'pendulum-squat',
    'v-squat',
    'leg-curl-standing',
    'nordic-curl',
    'cable-pull-through',
    'leg-press-feet-high',
    'hip-thrust-machine',
    'glute-kickback-machine',
    'abductor-machine',
    'frog-pump',
    'single-leg-calf',
    'smith-shrug',
    'trap-bar-shrug',
    'cable-shrug',
    'farmers-walk-forearms'
];

// Export pour utilisation dans le script d'import
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fittrackToKaggle, noKaggleMatch };
}
