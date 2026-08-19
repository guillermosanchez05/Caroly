// Unit tests for the pure helpers in js/utils.js (no external deps).
// Run with: node tests/utils.test.mjs

import assert from 'node:assert/strict';
import {
  addDays,
  oldestAllowedKey,
  nutritionForQuantity,
  sumNutrition,
} from '../js/utils.js';

// 7-day window: oldest allowed is today minus 6 days.
const today = '2026-08-19';
assert.equal(addDays(today, -6), '2026-08-13');
assert.equal(oldestAllowedKey(today), '2026-08-13');
assert.equal(addDays(today, 0), '2026-08-19');
assert.equal(addDays(today, 1), '2026-08-20');

// Month and year boundaries.
assert.equal(addDays('2026-03-01', -1), '2026-02-28');
assert.equal(addDays('2026-01-01', -1), '2025-12-31');

// Nutrition scales linearly from per-100 values.
const per100 = { kcal: 265, protein: 9, carbs: 49, fat: 3.2 };
assert.deepEqual(
  nutritionForQuantity(per100, 100),
  { kcal: 265, protein: 9, carbs: 49, fat: 3.2 },
);
assert.deepEqual(
  nutritionForQuantity(per100, 50),
  { kcal: 132.5, protein: 4.5, carbs: 24.5, fat: 1.6 },
);

// Summation across entries.
const total = sumNutrition([
  { kcal: 132.5, protein: 4.5, carbs: 24.5, fat: 1.6 },
  { kcal: 10, protein: 1, carbs: 2, fat: 0.5 },
]);
assert.deepEqual(total, { kcal: 142.5, protein: 5.5, carbs: 26.5, fat: 2.1 });

console.log('All utils tests passed.');
