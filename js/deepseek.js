// DeepSeek integration: turns free text into structured food entries.

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';

let configCache = null;

async function loadConfig() {
  if (!configCache) {
    try {
      configCache = await import('./config.js');
    } catch {
      configCache = {};
    }
  }
  return configCache;
}

function readApiKey(config) {
  try {
    const stored = localStorage.getItem('caroly.deepseekKey');
    if (stored) return stored;
  } catch {
    // localStorage unavailable (e.g. Node).
  }
  return config.DEEPSEEK_API_KEY || '';
}

function buildSystemPrompt() {
  return [
    'Eres un asistente de nutrición. A partir de un texto en español en el que una persona describe lo que ha comido, extrae los alimentos, sus cantidades y las recetas.',
    '',
    'Reglas:',
    '- Usa SOLO alimentos que aparezcan en el catálogo de alimentos (nombre exacto).',
    '- Usa SOLO recetas que aparezcan en el catálogo de recetas (nombre exacto).',
    '- Si el texto menciona algo que no está en ninguno de los dos catálogos, ignóralo.',
    '- La cantidad de un alimento debe expresarse en la unidad indicada para cada alimento (g o ml).',
    '- Si la persona da una cantidad explícita, úsala. Si dice "un/una", "dos", "medio/a", etc. sin cantidad, estima un tamaño de ración típico en gramos o mililitros.',
    '- Para las recetas, indica el número de porciones en "servings" (puede ser decimal, p. ej. 0.5 para media ración). Si no se indica, usa 1.',
    '- Detecta la comida a la que pertenece (desayuno, comida, merienda o cena) por palabras como "desayuno", "comida", "cena", "merienda", o por la hora. Si no está claro, usa "comida".',
    '- Devuelve ÚNICAMENTE un objeto JSON con este formato exacto:',
    '  {"meal": "desayuno|comida|merienda|cena", "items": [{"foodName": "nombre del alimento", "quantity": 100}], "recipes": [{"recipeName": "nombre de la receta", "servings": 1}]}',
    '- Si no hay nada reconocible, devuelve {"meal": "comida", "items": [], "recipes": []}.',
  ].join('\n');
}

/**
 * Extract foods and recipes from free text.
 * Returns a promise resolving to { meal, items: [{foodName, quantity}], recipes: [{recipeName, servings}] }.
 */
export async function extractFoodsFromText(text, foods, recipes = []) {
  const config = await loadConfig();
  const apiKey = readApiKey(config);
  if (!apiKey) {
    throw new Error('No hay API key de DeepSeek. Añádela en Ajustes (pestaña Alimentos → ⚙️).');
  }
  const model = config.DEEPSEEK_MODEL || DEFAULT_MODEL;

  const catalog = foods.map((f) => `${f.name} (unidad: ${f.unit})`).join('\n');
  const recipeCatalog = recipes.map((r) => r.name).join('\n');
  const userPrompt = `Catálogo de alimentos disponibles:\n${catalog}\n\nCatálogo de recetas disponibles:\n${recipeCatalog}\n\nTexto del usuario:\n"${text}"`;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`DeepSeek error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek devolvió una respuesta vacía.');
  }
  return JSON.parse(content);
}
