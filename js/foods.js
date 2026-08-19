// Meal types and the initial food catalog (values per 100 g or 100 ml).
// Nutritional values are approximate and intended as a starting point.

export const MEAL_TYPES = ['desayuno', 'comida', 'merienda', 'cena'];

export const MEAL_LABELS = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
};

export const INITIAL_FOODS = [
  { name: 'Arroz blanco cocido', unit: 'g', per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
  { name: 'Pasta cocida', unit: 'g', per100: { kcal: 131, protein: 5, carbs: 25, fat: 1.1 } },
  { name: 'Pan blanco', unit: 'g', per100: { kcal: 265, protein: 9, carbs: 49, fat: 3.2 } },
  { name: 'Patata cocida', unit: 'g', per100: { kcal: 87, protein: 2, carbs: 20, fat: 0.1 } },
  { name: 'Avena', unit: 'g', per100: { kcal: 389, protein: 16.9, carbs: 66, fat: 6.9 } },
  { name: 'Garbanzos cocidos', unit: 'g', per100: { kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 } },
  { name: 'Lentejas cocidas', unit: 'g', per100: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 } },
  { name: 'Pechuga de pollo', unit: 'g', per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } },
  { name: 'Ternera', unit: 'g', per100: { kcal: 250, protein: 26, carbs: 0, fat: 15 } },
  { name: 'Cerdo', unit: 'g', per100: { kcal: 242, protein: 27, carbs: 0, fat: 14 } },
  { name: 'Salmón', unit: 'g', per100: { kcal: 208, protein: 20, carbs: 0, fat: 13 } },
  { name: 'Atún en lata', unit: 'g', per100: { kcal: 116, protein: 26, carbs: 0, fat: 0.8 } },
  { name: 'Huevo', unit: 'g', per100: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 } },
  { name: 'Jamón serrano', unit: 'g', per100: { kcal: 241, protein: 30, carbs: 0, fat: 13 } },
  { name: 'Jamón york', unit: 'g', per100: { kcal: 107, protein: 17, carbs: 1.5, fat: 3 } },
  { name: 'Leche entera', unit: 'ml', per100: { kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
  { name: 'Yogur natural', unit: 'g', per100: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 } },
  { name: 'Queso fresco', unit: 'g', per100: { kcal: 98, protein: 12, carbs: 3.5, fat: 4 } },
  { name: 'Aceite de oliva', unit: 'ml', per100: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
  { name: 'Mantequilla', unit: 'g', per100: { kcal: 717, protein: 0.9, carbs: 0.1, fat: 81 } },
  { name: 'Almendras', unit: 'g', per100: { kcal: 579, protein: 21, carbs: 22, fat: 50 } },
  { name: 'Chocolate negro', unit: 'g', per100: { kcal: 546, protein: 4.9, carbs: 61, fat: 31 } },
  { name: 'Manzana', unit: 'g', per100: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
  { name: 'Plátano', unit: 'g', per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
  { name: 'Naranja', unit: 'g', per100: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 } },
  { name: 'Aguacate', unit: 'g', per100: { kcal: 160, protein: 2, carbs: 9, fat: 15 } },
  { name: 'Tomate', unit: 'g', per100: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
  { name: 'Lechuga', unit: 'g', per100: { kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 } },
  { name: 'Zanahoria', unit: 'g', per100: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
  { name: 'Brócoli', unit: 'g', per100: { kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4 } },
  { name: 'Vino tinto', unit: 'ml', per100: { kcal: 85, protein: 0.1, carbs: 2.6, fat: 0 } },
];
