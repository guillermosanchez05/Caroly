# Caroly

PWA personal de registro de comidas, calorías y macronutrientes (proteínas, hidratos de carbono y grasas) para iPhone.

- 100% local: sin backend, sin cuentas, sin base de datos remota.
- Persistencia en IndexedDB.
- Retención de datos de los últimos 7 días (limpieza automática al iniciar).
- Base de datos de alimentos con valores por 100 g/ml y página para gestionarlos (añadir, editar y eliminar).
- Entrada por voz: dictado → interpretación con DeepSeek → añadir alimentos.
- Funciona sin conexión tras la primera carga (excepto el dictado y la interpretación, que requieren internet).

## Ejecución en local (desarrollo)

Servir la carpeta con cualquier servidor estático y abrir la URL:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Instalación en el iPhone

Safari solo permite instalar PWAs servidas por HTTPS. Sube la carpeta a un
hosting estático (GitHub Pages, Netlify, Cloudflare Pages, etc.) y, en Safari:

1. Abre la URL del sitio.
2. Pulsa el botón **Compartir**.
3. Selecciona **"Añadir a pantalla de inicio"**.
4. Pulsa **"Añadir"**.

La app aparecerá en la pantalla de inicio como una aplicación independiente y
funcionará sin conexión tras la primera carga.

## Entrada por voz (DeepSeek)

El botón de micrófono (abajo a la derecha) dicta lo que dices, lo muestra y usa
la API de DeepSeek para extraer los alimentos y añadirlos al día.

Requisitos:
- Conexión a internet (el dictado y la interpretación no funcionan offline).
- Una API key de DeepSeek. Se configura en la app: pestaña **Alimentos → ⚙️ Ajustes**.
  La clave se guarda solo en el dispositivo (localStorage) y **no se sube a GitHub**.

Para desarrollo local también puedes usar `js/config.js` (gitignored) como alternativa:

```js
export const DEEPSEEK_API_KEY = 'tu-clave';
export const DEEPSEEK_MODEL = 'deepseek-v4-flash';
```

## Estructura

| Ruta | Descripción |
| --- | --- |
| `index.html` | Interfaz de la aplicación |
| `css/style.css` | Estilos (mobile-first) |
| `js/app.js` | Capa de interfaz y lógica de presentación |
| `js/db.js` | Capa de persistencia (IndexedDB) |
| `js/deepseek.js` | Interpretación de texto por voz con la API de DeepSeek |
| `js/config.js` | API key de DeepSeek (gitignored) |
| `js/foods.js` | Tipos de comida y catálogo inicial de alimentos |
| `js/utils.js` | Funciones puras (fechas y nutrición) |
| `manifest.json` | Manifiesto PWA |
| `service-worker.js` | Service worker (cache-first, offline) |
| `icons/` | Iconos de la aplicación |
| `scripts/generate-icons.py` | Genera los iconos (requiere Pillow) |

## Iconos

Para regenerar los iconos:

```bash
python3 scripts/generate-icons.py
```
