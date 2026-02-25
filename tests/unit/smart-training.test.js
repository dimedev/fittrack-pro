/**
 * Unit tests for smart-training logic (double progression, plateau, deload)
 * Replicated as pure functions for testability
 */
import { describe, it, expect } from 'vitest';

function calculateSuggestedWeight(logs, repsMin = 8, repsMax = 12, increment = 2.5) {
    if (logs.length === 0) {
        return { suggested: null, action: 'new', confidence: 'none' };
    }

    const lastLog = logs[logs.length - 1];
    const lastWeight = lastLog.weight || 0;
    let lastReps = 0;
    if (lastLog.setsDetail && lastLog.setsDetail.length > 0) {
        lastReps = Math.round(lastLog.setsDetail.reduce((s, set) => s + set.reps, 0) / lastLog.setsDetail.length);
    } else {
        lastReps = lastLog.achievedReps && lastLog.achievedSets
            ? Math.round(lastLog.achievedReps / lastLog.achievedSets) : 10;
    }

    let suggested = lastWeight;
    let action = 'reps_up';
    let confidence = 'high';

    if (lastReps >= repsMax) {
        suggested = lastWeight + increment;
        action = 'weight_up';
    } else if (lastReps < repsMin) {
        suggested = Math.max(0, lastWeight - increment);
        action = 'weight_down';
        confidence = 'medium';
    }

    const recentLogs = logs.slice(-4);
    if (recentLogs.length >= 3) {
        const allSameWeight = recentLogs.every(l => Math.abs((l.weight || 0) - lastWeight) < 0.5);
        if (allSameWeight && lastReps < repsMax) {
            action = 'plateau';
            confidence = 'medium';
        }
    }

    return { suggested: Math.round(suggested * 4) / 4, action, confidence, lastWeight, lastReps };
}

describe('calculateSuggestedWeight (double progression)', () => {
    it('returns null suggested for empty logs', () => {
        const r = calculateSuggestedWeight([]);
        expect(r.suggested).toBeNull();
        expect(r.action).toBe('new');
    });

    it('increases weight when reps max reached', () => {
        const logs = [{ weight: 60, setsDetail: [{ reps: 12 }, { reps: 12 }, { reps: 12 }] }];
        const r = calculateSuggestedWeight(logs, 8, 12, 2.5);
        expect(r.suggested).toBe(62.5);
        expect(r.action).toBe('weight_up');
    });

    it('decreases weight when reps below min', () => {
        const logs = [{ weight: 80, setsDetail: [{ reps: 5 }, { reps: 4 }, { reps: 4 }] }];
        const r = calculateSuggestedWeight(logs, 8, 12, 2.5);
        expect(r.suggested).toBe(77.5);
        expect(r.action).toBe('weight_down');
    });

    it('maintains weight when reps in range', () => {
        const logs = [{ weight: 70, setsDetail: [{ reps: 10 }, { reps: 9 }, { reps: 9 }] }];
        const r = calculateSuggestedWeight(logs, 8, 12, 2.5);
        expect(r.suggested).toBe(70);
        expect(r.action).toBe('reps_up');
    });

    it('detects plateau after 3+ sessions at same weight', () => {
        const logs = [
            { weight: 60, setsDetail: [{ reps: 10 }] },
            { weight: 60, setsDetail: [{ reps: 10 }] },
            { weight: 60, setsDetail: [{ reps: 10 }] },
        ];
        const r = calculateSuggestedWeight(logs, 8, 12, 2.5);
        expect(r.action).toBe('plateau');
    });

    it('does NOT flag plateau if reps max reached', () => {
        const logs = [
            { weight: 60, setsDetail: [{ reps: 12 }] },
            { weight: 60, setsDetail: [{ reps: 12 }] },
            { weight: 60, setsDetail: [{ reps: 12 }] },
        ];
        const r = calculateSuggestedWeight(logs, 8, 12, 2.5);
        expect(r.action).toBe('weight_up');
    });

    it('rounds to 0.25kg', () => {
        const logs = [{ weight: 61.3, setsDetail: [{ reps: 10 }] }];
        const r = calculateSuggestedWeight(logs, 8, 12, 2.5);
        expect(r.suggested % 0.25).toBe(0);
    });

    it('never suggests negative weight', () => {
        const logs = [{ weight: 1, setsDetail: [{ reps: 3 }] }];
        const r = calculateSuggestedWeight(logs, 8, 12, 2.5);
        expect(r.suggested).toBeGreaterThanOrEqual(0);
    });

    it('handles strength phase rep range (4-6)', () => {
        const logs = [{ weight: 100, setsDetail: [{ reps: 6 }, { reps: 6 }, { reps: 5 }] }];
        const r = calculateSuggestedWeight(logs, 4, 6, 2.5);
        expect(r.suggested).toBe(102.5);
        expect(r.action).toBe('weight_up');
    });
});

describe('State validation helpers', () => {
    function validateProfile(p) {
        return p &&
            typeof p.age === 'number' && p.age >= 10 && p.age <= 120 &&
            typeof p.weight === 'number' && p.weight >= 20 && p.weight <= 500 &&
            typeof p.height === 'number' && p.height >= 50 && p.height <= 300;
    }

    function validateFoodEntry(e) {
        return e && e.foodId && typeof e.quantity === 'number' && e.quantity > 0 && e.quantity <= 10000 &&
            e.mealType && ['breakfast', 'lunch', 'snack', 'dinner'].includes(e.mealType);
    }

    function validateCardio(c) {
        return c && c.type &&
            ['running', 'cycling', 'walking', 'swimming', 'boxing', 'other'].includes(c.type) &&
            typeof c.duration === 'number' && c.duration > 0 && c.duration <= 600;
    }

    it('validates correct profile', () => {
        expect(validateProfile({ age: 25, weight: 80, height: 180 })).toBe(true);
    });
    it('rejects profile with invalid age', () => {
        expect(validateProfile({ age: 5, weight: 80, height: 180 })).toBe(false);
    });
    it('rejects profile with negative weight', () => {
        expect(validateProfile({ age: 25, weight: -10, height: 180 })).toBe(false);
    });
    it('rejects null profile', () => {
        expect(validateProfile(null)).toBe(false);
    });

    it('validates correct food entry', () => {
        expect(validateFoodEntry({ foodId: 'chicken', quantity: 150, mealType: 'lunch' })).toBe(true);
    });
    it('rejects food entry with 0 quantity', () => {
        expect(validateFoodEntry({ foodId: 'chicken', quantity: 0, mealType: 'lunch' })).toBe(false);
    });
    it('rejects food entry with invalid mealType', () => {
        expect(validateFoodEntry({ foodId: 'chicken', quantity: 100, mealType: 'brunch' })).toBe(false);
    });

    it('validates correct cardio', () => {
        expect(validateCardio({ type: 'running', duration: 30 })).toBe(true);
    });
    it('rejects cardio with 0 duration', () => {
        expect(validateCardio({ type: 'running', duration: 0 })).toBe(false);
    });
    it('rejects cardio with invalid type', () => {
        expect(validateCardio({ type: 'flying', duration: 30 })).toBe(false);
    });
    it('rejects cardio duration > 600', () => {
        expect(validateCardio({ type: 'running', duration: 700 })).toBe(false);
    });
});

describe('Cardio calorie calculation', () => {
    const CARDIO_TYPES = {
        running: { met: { light: 6, moderate: 9.8, intense: 12.8 } },
        walking: { met: { light: 2.5, moderate: 3.5, intense: 5 } }
    };

    function calcCardioCalories(type, duration, intensity, weightKg = 70) {
        const ct = CARDIO_TYPES[type] || { met: { moderate: 6 } };
        const met = ct.met[intensity] || ct.met.moderate;
        return Math.round(met * weightKg * (duration / 60));
    }

    it('calculates running moderate 30min for 70kg', () => {
        const r = calcCardioCalories('running', 30, 'moderate', 70);
        expect(r).toBe(Math.round(9.8 * 70 * 0.5));
    });
    it('intense burns more than moderate', () => {
        const mod = calcCardioCalories('running', 30, 'moderate', 70);
        const intense = calcCardioCalories('running', 30, 'intense', 70);
        expect(intense).toBeGreaterThan(mod);
    });
    it('heavier person burns more', () => {
        const light = calcCardioCalories('running', 30, 'moderate', 60);
        const heavy = calcCardioCalories('running', 30, 'moderate', 90);
        expect(heavy).toBeGreaterThan(light);
    });
    it('walking burns less than running', () => {
        const walk = calcCardioCalories('walking', 30, 'moderate', 70);
        const run = calcCardioCalories('running', 30, 'moderate', 70);
        expect(run).toBeGreaterThan(walk);
    });
});
