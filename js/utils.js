// Pure helpers: date math and nutrition calculations.
// Kept dependency-free so they can be unit-tested in Node.

/** Format a Date as a local "YYYY-MM-DD" key. */
export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local date key for today. */
export function todayKey() {
  return toDateKey(new Date());
}

/** Shift a "YYYY-MM-DD" key by a number of days (local time, DST-safe). */
export function addDays(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Oldest date key that must be kept (today minus 6 days). */
export function oldestAllowedKey(key = todayKey()) {
  return addDays(key, -6);
}

/** Round to one decimal place. */
export function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Compute nutrition for a given quantity from per-100 values. */
export function nutritionForQuantity(per100, quantity) {
  const factor = quantity / 100;
  return {
    kcal: round1(per100.kcal * factor),
    protein: round1(per100.protein * factor),
    carbs: round1(per100.carbs * factor),
    fat: round1(per100.fat * factor),
  };
}

/** Sum kcal/protein/carbs/fat across a list of entries. */
export function sumNutrition(entries) {
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const entry of entries) {
    total.kcal += entry.kcal || 0;
    total.protein += entry.protein || 0;
    total.carbs += entry.carbs || 0;
    total.fat += entry.fat || 0;
  }
  return {
    kcal: round1(total.kcal),
    protein: round1(total.protein),
    carbs: round1(total.carbs),
    fat: round1(total.fat),
  };
}
