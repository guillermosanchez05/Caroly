# Caroly 🥗

**Caroly** es una *Progressive Web App* (PWA) personal para registrar y consultar las comidas, calorías y macronutrientes del día (proteínas, hidratos de carbono y grasas). Diseñada para un único iPhone: **100 % local**, sin backend, sin cuentas y sin bases de datos remotas.

> 🌍 Este README está disponible en **español** (a continuación) y en **inglés** (más abajo).
> — This README is available in **Spanish** (below) and **English** (further down).

---

## ✨ Características

- **Diario**: registro de comidas en 4 grupos fijos (Desayuno, Comida, Merienda y Cena) con totales de calorías y macronutrientes por comida y por día.
- **Catálogo de alimentos** con valores nutricionales por 100 g/ml, precargado con alimentos comunes. Gestión completa: crear, editar y eliminar.
- **Recetas**: se crean a partir del catálogo y se añaden al diario como una sola entrada, con número de raciones ajustable (0.5, 1, 2…).
- **Entrada por voz** (Web Speech API + DeepSeek): dicta lo que has comido y la app lo transcribe, interpreta y añade automáticamente.
- **Lector de código de barras** (ZXing + Open Food Facts): escanea el envase y añade el producto al catálogo.
- **Retención de 7 días**: solo se conserva la última semana (incluido hoy), con limpieza automática al iniciar.
- **Offline-first**: funciona sin conexión tras la primera carga (Service Worker).
- Interfaz **mobile-first**, optimizada para el tacto y para Safari en iPhone.

## 🛠️ Stack

- **JavaScript vanilla (ES Modules)** — sin frameworks ni bundlers.
- **IndexedDB** para la persistencia local.
- **Service Worker** propio para el modo offline.
- **Web Speech API** para el dictado.
- **DeepSeek API** para interpretar el texto transcrito.
- **ZXing** (vendored) para decodificar códigos de barras.
- **Open Food Facts API** para traducir un código de barras en datos nutricionales.

## 📋 Requisitos

- Navegador moderno (Safari en iPhone recomendado).
- **HTTPS** para instalar la PWA (GitHub Pages, Netlify, Cloudflare Pages…).
- Conexión a internet para la entrada por voz y el escáner de códigos.

## 🚀 Puesta en marcha (desarrollo)

```bash
python3 -m http.server 8000
# Abrir http://localhost:8000
```

## 📲 Desplegar e instalar en el iPhone

1. Sube la carpeta a un hosting estático (por ejemplo, GitHub Pages).
2. Abre la URL en **Safari** → **Compartir → Añadir a pantalla de inicio**.
3. En la pestaña **⚙️ Ajustes**, guarda tu **API key de DeepSeek** (se almacena solo en el dispositivo; sin ella la voz no funciona).

> `js/config.js` (gitignored) es una alternativa local a la clave; en producción se prefiere introducirla desde Ajustes.

### Entrada por voz

El botón de micrófono (abajo a la derecha) transcribe lo que dices en tiempo real, muestra el texto para que lo verifiques y usa **DeepSeek** para extraer alimentos y recetas, que se añaden al diario tras una confirmación.

### Lector de código de barras

El botón **📷** de la pestaña *Alimentos* abre el escáner (cámara en vivo o captura de foto). El código se busca en **Open Food Facts** y se muestra una vista previa editable (nombre y valores por 100 g) antes de guardarlo en el catálogo. Si el producto no existe, se abre el formulario manual con el código precargado.

## 📁 Estructura del proyecto

| Ruta | Descripción |
| --- | --- |
| `index.html` | Interfaz de la aplicación |
| `css/style.css` | Estilos mobile-first (tema naranja, feedback táctil) |
| `js/app.js` | Capa de interfaz y lógica de presentación |
| `js/db.js` | Capa de persistencia (IndexedDB) |
| `js/utils.js` | Funciones puras (fechas y nutrición) |
| `js/foods.js` | Tipos de comida y catálogo inicial de alimentos |
| `js/deepseek.js` | Interpretación de voz con la API de DeepSeek |
| `js/off.js` | Búsqueda de productos por código de barras (Open Food Facts) |
| `js/barcode.js` | Escáner de códigos de barras (cámara / foto) con ZXing |
| `js/vendor/zxing.esm.js` | Biblioteca ZXing empaquetada (vendored) |
| `js/config.js` | API key de DeepSeek (gitignored) |
| `service-worker.js` | Service worker (network-first, offline) |
| `manifest.json` | Manifiesto PWA |
| `icons/` | Iconos de la aplicación (generados desde el logo) |
| `scripts/generate-icons.py` | Regenera los iconos (requiere Pillow) |
| `tests/utils.test.mjs` | Tests de las funciones puras |

## 🧪 Tests

```bash
node tests/utils.test.mjs
```

## 📌 Notas

- Todos los datos se guardan **solo en el dispositivo**; no hay backend ni sincronización.
- Los valores de Open Food Facts son colaborativos y pueden ser aproximados: siempre se pueden corregir en la vista previa.

---

# English Version

**Caroly** is a personal *Progressive Web App* (PWA) to log and review your daily meals, calories and macronutrients (protein, carbs and fat). Built for a single iPhone and **100 % local** — no backend, no accounts, no remote databases.

## ✨ Features

- **Diary**: meals grouped into 4 fixed slots (Breakfast, Lunch, Snack and Dinner) with per-meal and daily kcal/macronutrient totals.
- **Food catalog** with per-100 g/ml nutrition, preloaded with common foods. Full management: create, edit and delete.
- **Recipes**: built from catalog foods and added to the diary as a single entry, with adjustable servings (0.5, 1, 2…).
- **Voice input** (Web Speech API + DeepSeek): say what you ate and the app transcribes, interprets and adds it automatically.
- **Barcode scanner** (ZXing + Open Food Facts): scan the package and add the product to the catalog.
- **7-day retention**: only the last week is kept (including today), pruned automatically on startup.
- **Offline-first**: works without a connection after the first load (Service Worker).
- **Mobile-first** UI, optimised for touch and for Safari on iPhone.

## 🛠️ Tech Stack

- **Vanilla JavaScript (ES Modules)** — no frameworks, no bundlers.
- **IndexedDB** for local persistence.
- **Service Worker** for offline support.
- **Web Speech API** for dictation.
- **DeepSeek API** to parse the transcribed text.
- **ZXing** (vendored) to decode barcodes.
- **Open Food Facts API** to translate a barcode into nutrition data.

## 📋 Requirements

- A modern browser (Safari on iPhone recommended).
- **HTTPS** to install the PWA (GitHub Pages, Netlify, Cloudflare Pages…).
- Internet connection for voice input and barcode lookups.

## 🚀 Getting Started (development)

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## 📲 Deploying and installing on iPhone

1. Upload the folder to a static host (e.g. GitHub Pages).
2. Open the URL in **Safari** → **Share → Add to Home Screen**.
3. In the **⚙️ Settings** tab, save your **DeepSeek API key** (stored on-device only; voice needs it).

> `js/config.js` (gitignored) is a local alternative for the key; in production, enter it from Settings.

### Voice input

The microphone button (bottom right) transcribes your speech live, shows the text for verification and uses **DeepSeek** to extract foods and recipes, which are added to the diary after confirmation.

### Barcode scanner

The **📷** button in the *Foods* tab opens the scanner (live camera or photo capture). The barcode is looked up in **Open Food Facts** and an editable preview (name + per-100 g values) is shown before saving it to the catalog. If the product does not exist, the manual form opens with the barcode pre-filled.

## 📁 Project Structure

| Path | Description |
| --- | --- |
| `index.html` | Application UI |
| `css/style.css` | Mobile-first styles (orange theme, tactile feedback) |
| `js/app.js` | UI layer and presentation logic |
| `js/db.js` | Persistence layer (IndexedDB) |
| `js/utils.js` | Pure helpers (dates and nutrition) |
| `js/foods.js` | Meal types and initial food catalog |
| `js/deepseek.js` | Voice interpretation with the DeepSeek API |
| `js/off.js` | Barcode product lookup (Open Food Facts) |
| `js/barcode.js` | Barcode scanner (camera / photo) with ZXing |
| `js/vendor/zxing.esm.js` | Bundled ZXing library (vendored) |
| `js/config.js` | DeepSeek API key (gitignored) |
| `service-worker.js` | Service worker (network-first, offline) |
| `manifest.json` | PWA manifest |
| `icons/` | App icons (generated from the logo) |
| `scripts/generate-icons.py` | Regenerates the icons (requires Pillow) |
| `tests/utils.test.mjs` | Unit tests for the pure helpers |

## 🧪 Tests

```bash
node tests/utils.test.mjs
```

## 📌 Notes

- All data is stored **on-device only**; there is no backend or sync.
- Open Food Facts values are community-sourced and may be approximate: they can always be corrected in the preview.
