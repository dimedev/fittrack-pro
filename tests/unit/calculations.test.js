/**
 * Unit tests for pure calculation functions
 * These are extracted/replicated from the app modules for testability
 */

import { describe, it, expect } from 'vitest';

// ==================== CALORIE BURN (from training.js) ====================

/**
 * Calcule les calories brûlées — MET method
 */
function calcCaloriesBurned(totalVolume, durationMinutes, userWeightKg = 70) {
    const volumePerMinute = totalVolume / durationMinutes;
    let met = 5; // Modéré
    if (volumePerMinute > 150) met = 6;  // Intense
    else if (volumePerMinute < 80) met = 4; // Léger
    return Math.round(met * userWeightKg * (durationMinutes / 60));
}

describe('calcCaloriesBurned', () => {
    it('returns moderate estimate for typical session', () => {
        const result = calcCaloriesBurned(5000, 60, 75);
        expect(result).toBeGreaterThan(200);
        expect(result).toBeLessThan(800);
    });

    it('uses MET=6 for high intensity (volume/min > 150)', () => {
        // 200kg/min * 60min = 12000 total volume
        const result = calcCaloriesBurned(12000, 60, 70);
        // MET 6: 6 * 70 * (60/60) = 420
        expect(result).toBe(420);
    });

    it('uses MET=4 for low intensity (volume/min < 80)', () => {
        // 50kg/min * 60min = 3000 total volume
        const result = calcCaloriesBurned(3000, 60, 70);
        // MET 4: 4 * 70 * (60/60) = 280
        expect(result).toBe(280);
    });

    it('uses MET=5 for moderate intensity', () => {
        // 100kg/min * 45min = 4500 total volume
        const result = calcCaloriesBurned(4500, 45, 80);
        // MET 5: 5 * 80 * (45/60) = 300
        expect(result).toBe(300);
    });

    it('scales with user body weight', () => {
        const light = calcCaloriesBurned(5000, 60, 60);
        const heavy = calcCaloriesBurned(5000, 60, 100);
        expect(heavy).toBeGreaterThan(light);
    });
});

// ==================== NUTRITION MACROS ====================

/**
 * Compute nutrition for a given quantity (in grams) from a food item
 */
function computeMacros(food, quantityG) {
    const ratio = quantityG / 100;
    return {
        calories: Math.round(food.calories * ratio),
        protein:  Math.round(food.protein  * ratio * 10) / 10,
        carbs:    Math.round(food.carbs    * ratio * 10) / 10,
        fat:      Math.round(food.fat      * ratio * 10) / 10
    };
}

describe('computeMacros', () => {
    const chicken = { calories: 165, protein: 31, carbs: 0, fat: 3.6 };

    it('computes macros for 100g', () => {
        const result = computeMacros(chicken, 100);
        expect(result.calories).toBe(165);
        expect(result.protein).toBe(31);
        expect(result.carbs).toBe(0);
    });

    it('computes macros for 200g (doubles)', () => {
        const result = computeMacros(chicken, 200);
        expect(result.calories).toBe(330);
        expect(result.protein).toBe(62);
    });

    it('computes macros for 150g', () => {
        const result = computeMacros(chicken, 150);
        expect(result.calories).toBe(Math.round(165 * 1.5));
        expect(result.protein).toBeCloseTo(31 * 1.5, 1);
    });

    it('rounds calories to integer', () => {
        const result = computeMacros({ calories: 333, protein: 15, carbs: 5, fat: 2 }, 75);
        expect(Number.isInteger(result.calories)).toBe(true);
    });

    it('handles zero quantity', () => {
        const result = computeMacros(chicken, 0);
        expect(result.calories).toBe(0);
        expect(result.protein).toBe(0);
    });
});

// ==================== PROGRAM RECOMMENDATIONS ====================

/**
 * Replicated from training.js — pure function, no state
 */
function getProgramRecommendations(frequency) {
    const baseRecommendations = {
        2: ['full-body', 'upper-lower', 'ppl'],
        3: ['full-body', 'ppl', 'upper-lower'],
        4: ['upper-lower', 'ppl', 'full-body'],
        5: ['ppl', 'bro-split', 'upper-lower'],
        6: ['ppl', 'arnold', 'bro-split']
    };
    return baseRecommendations[frequency] || ['ppl', 'upper-lower', 'full-body'];
}

describe('getProgramRecommendations', () => {
    it('returns array for each frequency', () => {
        [2, 3, 4, 5, 6].forEach(f => {
            expect(Array.isArray(getProgramRecommendations(f))).toBe(true);
        });
    });

    it('returns at least 2 programs', () => {
        [2, 3, 4, 5, 6].forEach(f => {
            expect(getProgramRecommendations(f).length).toBeGreaterThanOrEqual(2);
        });
    });

    it('recommends full-body for low frequency', () => {
        const recs = getProgramRecommendations(2);
        expect(recs[0]).toBe('full-body');
    });

    it('recommends PPL for high frequency', () => {
        const recs = getProgramRecommendations(5);
        expect(recs[0]).toBe('ppl');
    });

    it('returns fallback for unknown frequency', () => {
        const recs = getProgramRecommendations(99);
        expect(recs).toContain('ppl');
    });
});

// ==================== SESSION VOLUME ====================

/**
 * Calculate total volume from completed sets
 */
function calcTotalVolume(sets) {
    return sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
}

describe('calcTotalVolume', () => {
    it('sums weight * reps for all sets', () => {
        const sets = [
            { weight: 80, reps: 10 },
            { weight: 80, reps: 8 },
            { weight: 75, reps: 10 }
        ];
        expect(calcTotalVolume(sets)).toBe(80 * 10 + 80 * 8 + 75 * 10);
    });

    it('returns 0 for empty sets', () => {
        expect(calcTotalVolume([])).toBe(0);
    });

    it('handles single set', () => {
        expect(calcTotalVolume([{ weight: 100, reps: 5 }])).toBe(500);
    });
});

// ==================== DATE HELPERS ====================

/**
 * Format date as YYYY-MM-DD (from various modules)
 */
function toDateString(date) {
    return new Date(date).toISOString().split('T')[0];
}

describe('toDateString', () => {
    it('formats a date correctly', () => {
        const result = toDateString(new Date('2026-02-25T10:00:00Z'));
        expect(result).toBe('2026-02-25');
    });

    it('returns today format when given Date.now()', () => {
        const result = toDateString(Date.now());
        expect(/^\d{4}-\d{2}-\d{2}$/.test(result)).toBe(true);
    });
});

// ==================== 1RM ESTIMATE (Brzycki) ====================

/**
 * Estimate one-rep max from weight + reps (Brzycki formula)
 * Used in PR detection
 */
function estimate1RM(weight, reps) {
    if (reps === 1) return weight;
    if (reps <= 0 || weight <= 0) return 0;
    return Math.round(weight * (36 / (37 - reps)));
}

describe('estimate1RM', () => {
    it('returns weight itself for 1 rep', () => {
        expect(estimate1RM(100, 1)).toBe(100);
    });

    it('estimates higher 1RM for more reps at same weight', () => {
        const r5  = estimate1RM(80, 5);
        const r10 = estimate1RM(80, 10);
        expect(r10).toBeGreaterThan(r5);
    });

    it('returns 0 for invalid input', () => {
        expect(estimate1RM(0, 10)).toBe(0);
        expect(estimate1RM(80, 0)).toBe(0);
    });

    it('produces a reasonable range for common lifts', () => {
        // 80kg × 8 reps → ~1RM should be ~100-110kg
        const est = estimate1RM(80, 8);
        expect(est).toBeGreaterThan(90);
        expect(est).toBeLessThan(130);
    });
});
