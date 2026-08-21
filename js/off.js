// Open Food Facts client: translates a barcode into food nutrition data.

const OFF_API = 'https://world.openfoodfacts.org/api/v2/product';

function sanitize(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function detectUnit(quantityText) {
  if (!quantityText) return 'g';
  return /ml\b/i.test(quantityText) ? 'ml' : 'g';
}

/**
 * Look up a product by its barcode.
 * Resolves to { name, brands, unit, per100 } or null when not found /
 * without nutrition data.
 */
export async function lookupProduct(barcode) {
  const url = `${OFF_API}/${encodeURIComponent(barcode)}.json?fields=code,status,product_name,brands,quantity,nutriments`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const product = data.product;
  if (!product) return null;

  const n = product.nutriments || {};
  const per100 = {
    kcal: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null,
    protein: n['proteins_100g'] ?? n['proteins'] ?? null,
    carbs: n['carbohydrates_100g'] ?? n['carbohydrates'] ?? null,
    fat: n['fat_100g'] ?? n['fat'] ?? null,
  };
  const hasAny = per100.kcal != null || per100.protein != null
    || per100.carbs != null || per100.fat != null;
  if (!hasAny) return null;

  return {
    name: product.product_name || `Producto ${barcode}`,
    brands: product.brands || '',
    unit: detectUnit(product.quantity),
    per100: {
      kcal: sanitize(per100.kcal),
      protein: sanitize(per100.protein),
      carbs: sanitize(per100.carbs),
      fat: sanitize(per100.fat),
    },
  };
}
