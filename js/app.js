// UI layer: page navigation, day view, food catalog management and voice input.

import {
  openDB,
  listFoods,
  addFood,
  updateFood,
  deleteFood,
  getDay,
  saveDay,
  cleanupOldDays,
} from './db.js';
import { MEAL_TYPES, MEAL_LABELS } from './foods.js';
import { extractFoodsFromText } from './deepseek.js';
import {
  todayKey,
  addDays,
  nutritionForQuantity,
  sumNutrition,
  round1,
} from './utils.js';

const $ = (id) => document.getElementById(id);

const els = {
  pageDiary: $('page-diary'),
  pageFoods: $('page-foods'),
  prevDay: $('prev-day'),
  nextDay: $('next-day'),
  dateText: $('date-text'),
  dateSubtext: $('date-subtext'),
  summary: $('summary'),
  meals: $('meals'),
  foodsSearch: $('foods-search'),
  foodsNewBtn: $('foods-new-btn'),
  foodsList: $('foods-list'),
  picker: $('picker'),
  pickerTitle: $('picker-title'),
  pickerClose: $('picker-close'),
  pickerSearch: $('picker-search'),
  newFoodBtn: $('new-food-btn'),
  pickerList: $('picker-list'),
  foodForm: $('food-form'),
  foodFormTitle: $('food-form-title'),
  foodFormClose: $('food-form-close'),
  foodFormCancel: $('food-form-cancel'),
  newFoodForm: $('new-food-form'),
  foodName: $('food-name'),
  foodKcal: $('food-kcal'),
  foodProtein: $('food-protein'),
  foodCarbs: $('food-carbs'),
  foodFat: $('food-fat'),
  foodFormError: $('food-form-error'),
  quantityForm: $('quantity-form'),
  quantityTitle: $('quantity-title'),
  quantityClose: $('quantity-close'),
  quantityCancel: $('quantity-cancel'),
  quantityConfirm: $('quantity-confirm'),
  quantityInfo: $('quantity-info'),
  quantityLabel: $('quantity-label'),
  quantityInput: $('quantity-input'),
  quantityResult: $('quantity-result'),
  micBtn: $('mic-btn'),
  voiceSheet: $('voice-sheet'),
  voiceClose: $('voice-close'),
  voiceTranscript: $('voice-transcript'),
  voiceError: $('voice-error'),
  voiceMeal: $('voice-meal'),
  voiceItems: $('voice-items'),
  voiceRetry: $('voice-retry'),
  voiceConfirm: $('voice-confirm'),
  settingsBtn: $('settings-btn'),
  settingsSheet: $('settings-sheet'),
  settingsClose: $('settings-close'),
  settingsCancel: $('settings-cancel'),
  settingsSave: $('settings-save'),
  settingsKey: $('settings-key'),
  settingsStatus: $('settings-status'),
};

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const state = {
  page: 'diary',
  currentDateKey: todayKey(),
  foods: [],
  day: null,
  pickerTarget: null,
  selectedFood: null,
  editingFood: null,
  foodFormOrigin: 'picker',
  voiceItems: [],
};

init();

async function init() {
  await openDB();
  await cleanupOldDays(todayKey());
  state.foods = await listFoods();
  populateMealSelect();
  await loadDay();
  renderAll();
  bindEvents();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function emptyDay() {
  const meals = {};
  for (const type of MEAL_TYPES) meals[type] = [];
  return { date: state.currentDateKey, meals };
}

async function loadDay() {
  const stored = await getDay(state.currentDateKey);
  state.day = stored || emptyDay();
}

function dayEntries() {
  const entries = [];
  for (const type of MEAL_TYPES) entries.push(...state.day.meals[type]);
  return entries;
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDateLabel(key) {
  const today = todayKey();
  if (key === today) return 'Hoy';
  if (key === addDays(today, -1)) return 'Ayer';
  return capitalize(WEEKDAYS[parseKey(key).getDay()]);
}

function formatDateSubtext(key) {
  const date = parseKey(key);
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function findFood(name) {
  return state.foods.find((f) => f.name === name) || null;
}

// ----- Pages -----

function switchPage(page) {
  state.page = page;
  els.pageDiary.hidden = page !== 'diary';
  els.pageFoods.hidden = page !== 'foods';
  document.querySelectorAll('.tab').forEach((tab) =>
    tab.classList.toggle('is-active', tab.dataset.page === page));
  if (page === 'foods') renderFoodsList(els.foodsSearch.value);
}

// ----- Rendering: diary -----

function renderAll() {
  renderHeader();
  renderSummary();
  renderMeals();
}

function renderHeader() {
  const today = todayKey();
  const oldest = addDays(today, -6);
  els.prevDay.disabled = state.currentDateKey <= oldest;
  els.nextDay.disabled = state.currentDateKey >= today;
  els.dateText.textContent = formatDateLabel(state.currentDateKey);
  els.dateSubtext.textContent = formatDateSubtext(state.currentDateKey);
}

function renderSummary() {
  const totals = sumNutrition(dayEntries());
  els.summary.innerHTML = `
    <div class="summary-kcal">
      <strong>${totals.kcal}</strong><span>kcal</span>
    </div>
    <div class="summary-macros">
      <div><span class="dot dot-protein"></span><strong>${totals.protein}</strong> g proteína</div>
      <div><span class="dot dot-carbs"></span><strong>${totals.carbs}</strong> g hidratos</div>
      <div><span class="dot dot-fat"></span><strong>${totals.fat}</strong> g grasas</div>
    </div>`;
}

function entryItem(type, entry) {
  return `
    <li class="entry">
      <div class="entry-main">
        <span class="entry-name">${escapeHtml(entry.foodName)}</span>
        <span class="entry-qty">${entry.quantity} ${entry.unit}</span>
      </div>
      <div class="entry-nutrition">${entry.kcal} kcal · P ${entry.protein} · C ${entry.carbs} · G ${entry.fat}</div>
      <button class="entry-delete" data-type="${type}" data-id="${entry.id}" aria-label="Eliminar">✕</button>
    </li>`;
}

function renderMeals() {
  els.meals.innerHTML = '';
  for (const type of MEAL_TYPES) {
    const entries = state.day.meals[type];
    const subtotal = sumNutrition(entries);
    const card = document.createElement('section');
    card.className = 'meal-card';
    card.innerHTML = `
      <header class="meal-header">
        <h2>${MEAL_LABELS[type]}</h2>
        <span class="meal-subtotal">${subtotal.kcal} kcal</span>
      </header>
      ${entries.length
        ? `<ul class="entry-list">${entries.map((e) => entryItem(type, e)).join('')}</ul>`
        : '<p class="empty">Sin alimentos</p>'}
      <button class="btn add-entry" data-type="${type}">＋ Añadir alimento</button>`;
    els.meals.appendChild(card);
  }
  document.querySelectorAll('.add-entry').forEach((btn) =>
    btn.addEventListener('click', () => openPicker(btn.dataset.type)));
  document.querySelectorAll('.entry-delete').forEach((btn) =>
    btn.addEventListener('click', () => removeEntry(btn.dataset.type, btn.dataset.id)));
}

async function persistDay() {
  await saveDay(state.day);
  await cleanupOldDays(todayKey());
}

async function removeEntry(type, id) {
  state.day.meals[type] = state.day.meals[type].filter((e) => e.id !== id);
  await persistDay();
  renderAll();
}

async function navigate(delta) {
  const target = addDays(state.currentDateKey, delta);
  const today = todayKey();
  const oldest = addDays(today, -6);
  if (target < oldest || target > today) return;
  state.currentDateKey = target;
  await loadDay();
  renderAll();
}

// ----- Food picker -----

function openPicker(type) {
  state.pickerTarget = type;
  els.pickerTitle.textContent = `Añadir a ${MEAL_LABELS[type]}`;
  els.pickerSearch.value = '';
  renderPickerList('');
  els.picker.hidden = false;
}

function renderPickerList(query) {
  const q = query.trim().toLowerCase();
  const filtered = state.foods.filter((f) => f.name.toLowerCase().includes(q));
  els.pickerList.innerHTML = '';
  if (filtered.length === 0) {
    els.pickerList.innerHTML = '<li class="empty">Sin resultados</li>';
    return;
  }
  for (const food of filtered) {
    const li = document.createElement('li');
    li.className = 'food-item';
    li.innerHTML = `
      <div class="food-name">${escapeHtml(food.name)}</div>
      <div class="food-per100">${food.per100.kcal} kcal · P ${food.per100.protein} · C ${food.per100.carbs} · G ${food.per100.fat} / 100 ${food.unit}</div>`;
    li.addEventListener('click', () => openQuantity(food));
    els.pickerList.appendChild(li);
  }
}

// ----- Quantity entry -----

function openQuantity(food) {
  state.selectedFood = food;
  els.quantityTitle.textContent = food.name;
  els.quantityInfo.innerHTML =
    `Por 100 ${food.unit}: ${food.per100.kcal} kcal · P ${food.per100.protein} · C ${food.per100.carbs} · G ${food.per100.fat}`;
  els.quantityLabel.textContent = `Cantidad (${food.unit})`;
  els.quantityInput.value = '';
  els.quantityResult.textContent = '';
  els.picker.hidden = true;
  els.quantityForm.hidden = false;
  els.quantityInput.focus();
}

function updateQuantityResult() {
  const quantity = parseFloat(els.quantityInput.value);
  if (!state.selectedFood || Number.isNaN(quantity) || quantity <= 0) {
    els.quantityResult.textContent = '';
    return;
  }
  const n = nutritionForQuantity(state.selectedFood.per100, quantity);
  els.quantityResult.textContent = `${n.kcal} kcal · P ${n.protein} · C ${n.carbs} · G ${n.fat}`;
}

async function confirmQuantity() {
  const quantity = parseFloat(els.quantityInput.value);
  const food = state.selectedFood;
  if (!food || Number.isNaN(quantity) || quantity <= 0) return;
  addEntryToMeal(state.pickerTarget, food, quantity);
  await persistDay();
  closeAllOverlays();
  renderAll();
}

function addEntryToMeal(type, food, quantity) {
  const n = nutritionForQuantity(food.per100, quantity);
  state.day.meals[type].push({
    id: uid(),
    foodName: food.name,
    quantity: round1(quantity),
    unit: food.unit,
    kcal: n.kcal,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
  });
}

// ----- Food form (add / edit) -----

function openFoodForm(origin) {
  state.foodFormOrigin = origin;
  state.editingFood = null;
  els.foodFormTitle.textContent = 'Nuevo alimento';
  resetFoodForm();
  els.picker.hidden = true;
  els.foodForm.hidden = false;
}

function openFoodEdit(food) {
  state.foodFormOrigin = 'foods';
  state.editingFood = food;
  els.foodFormTitle.textContent = 'Editar alimento';
  resetFoodForm();
  els.foodName.value = food.name;
  setUnitRadio(food.unit);
  els.foodKcal.value = food.per100.kcal;
  els.foodProtein.value = food.per100.protein;
  els.foodCarbs.value = food.per100.carbs;
  els.foodFat.value = food.per100.fat;
  els.foodForm.hidden = false;
}

function setUnitRadio(unit) {
  const radio = document.querySelector(`input[name="unit"][value="${unit}"]`);
  if (radio) radio.checked = true;
}

function resetFoodForm() {
  els.newFoodForm.reset();
  els.foodFormError.hidden = true;
}

function showFoodError(message) {
  els.foodFormError.textContent = message;
  els.foodFormError.hidden = false;
}

async function submitFoodForm(event) {
  event.preventDefault();

  const name = els.foodName.value.trim();
  const unit = document.querySelector('input[name="unit"]:checked').value;
  const per100 = {
    kcal: parseFloat(els.foodKcal.value),
    protein: parseFloat(els.foodProtein.value),
    carbs: parseFloat(els.foodCarbs.value),
    fat: parseFloat(els.foodFat.value),
  };

  if (!name) {
    showFoodError('Introduce un nombre.');
    return;
  }
  if ([per100.kcal, per100.protein, per100.carbs, per100.fat].some(
    (v) => Number.isNaN(v) || v < 0)) {
    showFoodError('Introduce valores numéricos válidos (0 o más).');
    return;
  }

  try {
    let food;
    if (state.editingFood) {
      food = await updateFood(state.editingFood.name, { name, unit, per100 });
    } else {
      food = await addFood({ name, unit, per100 });
    }
    await refreshFoods();

    if (state.editingFood) {
      els.foodForm.hidden = true;
      renderFoodsList(els.foodsSearch.value);
    } else if (state.foodFormOrigin === 'picker') {
      openQuantity(food);
    } else {
      els.foodForm.hidden = true;
      renderFoodsList(els.foodsSearch.value);
    }
  } catch (err) {
    showFoodError(err.message);
  }
}

async function refreshFoods() {
  state.foods = await listFoods();
}

// ----- Foods management page -----

function renderFoodsList(query) {
  const q = query.trim().toLowerCase();
  const filtered = state.foods.filter((f) => f.name.toLowerCase().includes(q));
  els.foodsList.innerHTML = '';
  if (filtered.length === 0) {
    els.foodsList.innerHTML = '<li class="empty">Sin alimentos</li>';
    return;
  }
  for (const food of filtered) {
    const li = document.createElement('li');
    li.className = 'foods-item';
    li.innerHTML = `
      <div class="foods-item-main">
        <div class="food-name">${escapeHtml(food.name)}</div>
        <div class="food-per100">${food.per100.kcal} kcal · P ${food.per100.protein} · C ${food.per100.carbs} · G ${food.per100.fat} / 100 ${food.unit}</div>
      </div>
      <button class="foods-item-delete" data-name="${escapeHtml(food.name)}" aria-label="Eliminar">🗑</button>`;
    li.addEventListener('click', (e) => {
      if (e.target.closest('.foods-item-delete')) return;
      openFoodEdit(food);
    });
    els.foodsList.appendChild(li);
  }
  els.foodsList.querySelectorAll('.foods-item-delete').forEach((btn) =>
    btn.addEventListener('click', () => deleteFoodByName(btn.dataset.name)));
}

async function deleteFoodByName(name) {
  if (!window.confirm(`¿Eliminar "${name}" del catálogo?`)) return;
  await deleteFood(name);
  await refreshFoods();
  renderFoodsList(els.foodsSearch.value);
}

// ----- Voice input -----

function getRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

function populateMealSelect() {
  els.voiceMeal.innerHTML = '';
  for (const type of MEAL_TYPES) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = MEAL_LABELS[type];
    els.voiceMeal.appendChild(option);
  }
  els.voiceMeal.value = 'comida';
}

function toggleMicListening(on) {
  els.micBtn.classList.toggle('is-listening', on);
}

function startVoice() {
  const recognition = getRecognition();
  if (!recognition) {
    window.alert('Tu navegador no soporta reconocimiento de voz. Usa Safari o Chrome actualizados.');
    return;
  }
  state.recognition = recognition;
  toggleMicListening(true);

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    handleVoiceTranscript(transcript);
  };
  recognition.onerror = (event) => {
    toggleMicListening(false);
    const messages = {
      'not-allowed': 'Permiso de micrófono denegado. Actívalo en los ajustes del navegador.',
      'no-speech': 'No he detectado voz. Inténtalo de nuevo.',
      network: 'Error de red en el reconocimiento de voz.',
    };
    window.alert(messages[event.error] || `Error de voz: ${event.error}`);
  };
  recognition.onend = () => toggleMicListening(false);

  recognition.start();
}

async function handleVoiceTranscript(transcript) {
  els.voiceTranscript.textContent = transcript;
  els.voiceError.hidden = true;
  els.voiceItems.innerHTML = '<li class="empty">Interpretando…</li>';
  els.voiceMeal.value = 'comida';
  openVoiceSheet();

  try {
    const parsed = await extractFoodsFromText(transcript, state.foods);
    const items = normalizeVoiceItems(parsed);
    state.voiceItems = items;
    if (parsed && MEAL_TYPES.includes(parsed.meal)) {
      els.voiceMeal.value = parsed.meal;
    }
    renderVoiceItems(items);
  } catch (err) {
    state.voiceItems = [];
    els.voiceItems.innerHTML = '';
    showVoiceError(err.message || 'No se pudo interpretar el texto.');
  }
}

function normalizeVoiceItems(parsed) {
  const items = [];
  if (!parsed || !Array.isArray(parsed.items)) return items;
  for (const item of parsed.items) {
    const food = findFood(item.foodName);
    const quantity = parseFloat(item.quantity);
    if (!food || Number.isNaN(quantity) || quantity <= 0) continue;
    items.push({ food, quantity: round1(quantity) });
  }
  return items;
}

function renderVoiceItems(items) {
  els.voiceItems.innerHTML = '';
  if (items.length === 0) {
    els.voiceItems.innerHTML = '<li class="empty">No he encontrado alimentos del catálogo en el texto.</li>';
    return;
  }
  for (const item of items) {
    const n = nutritionForQuantity(item.food.per100, item.quantity);
    const li = document.createElement('li');
    li.className = 'entry';
    li.innerHTML = `
      <div class="entry-main">
        <span class="entry-name">${escapeHtml(item.food.name)}</span>
        <span class="entry-qty">${item.quantity} ${item.food.unit}</span>
      </div>
      <div class="entry-nutrition">${n.kcal} kcal · P ${n.protein} · C ${n.carbs} · G ${n.fat}</div>`;
    els.voiceItems.appendChild(li);
  }
}

function showVoiceError(message) {
  els.voiceError.textContent = message;
  els.voiceError.hidden = false;
}

function openVoiceSheet() {
  els.voiceSheet.hidden = false;
}

function closeVoiceSheet() {
  els.voiceSheet.hidden = true;
}

async function confirmVoice() {
  const type = els.voiceMeal.value;
  if (state.voiceItems.length === 0) return;
  for (const item of state.voiceItems) {
    addEntryToMeal(type, item.food, item.quantity);
  }
  await persistDay();
  closeVoiceSheet();
  renderAll();
}

// ----- Settings -----

function openSettings() {
  try {
    els.settingsKey.value = localStorage.getItem('caroly.deepseekKey') || '';
  } catch {
    els.settingsKey.value = '';
  }
  els.settingsStatus.textContent = '';
  els.settingsSheet.hidden = false;
}

function saveSettings() {
  const key = els.settingsKey.value.trim();
  try {
    if (key) {
      localStorage.setItem('caroly.deepseekKey', key);
      els.settingsStatus.textContent = 'Clave guardada en este dispositivo.';
    } else {
      localStorage.removeItem('caroly.deepseekKey');
      els.settingsStatus.textContent = 'Clave eliminada.';
    }
  } catch {
    els.settingsStatus.textContent = 'No se pudo guardar la clave.';
  }
}

// ----- Overlay helpers -----

function closeAllOverlays() {
  [els.picker, els.foodForm, els.quantityForm, els.voiceSheet].forEach((o) => {
    o.hidden = true;
  });
}

function backToPicker() {
  els.foodForm.hidden = true;
  els.quantityForm.hidden = true;
  els.picker.hidden = false;
  renderPickerList(els.pickerSearch.value);
}

function afterFoodFormClose() {
  els.foodForm.hidden = true;
  if (state.page === 'foods') {
    renderFoodsList(els.foodsSearch.value);
  } else if (state.foodFormOrigin === 'picker') {
    backToPicker();
  }
}

// ----- Event bindings -----

function bindEvents() {
  document.querySelectorAll('.tab').forEach((tab) =>
    tab.addEventListener('click', () => switchPage(tab.dataset.page)));

  els.prevDay.addEventListener('click', () => navigate(-1));
  els.nextDay.addEventListener('click', () => navigate(1));

  els.pickerClose.addEventListener('click', closeAllOverlays);
  els.pickerSearch.addEventListener('input', () => renderPickerList(els.pickerSearch.value));
  els.newFoodBtn.addEventListener('click', () => openFoodForm('picker'));

  els.foodFormClose.addEventListener('click', afterFoodFormClose);
  els.foodFormCancel.addEventListener('click', afterFoodFormClose);
  els.newFoodForm.addEventListener('submit', submitFoodForm);

  els.quantityClose.addEventListener('click', backToPicker);
  els.quantityCancel.addEventListener('click', backToPicker);
  els.quantityConfirm.addEventListener('click', confirmQuantity);
  els.quantityInput.addEventListener('input', updateQuantityResult);

  els.foodsSearch.addEventListener('input', () => renderFoodsList(els.foodsSearch.value));
  els.foodsNewBtn.addEventListener('click', () => openFoodForm('foods'));

  els.micBtn.addEventListener('click', startVoice);
  els.voiceClose.addEventListener('click', closeVoiceSheet);
  els.voiceRetry.addEventListener('click', () => { closeVoiceSheet(); startVoice(); });
  els.voiceConfirm.addEventListener('click', confirmVoice);

  els.settingsBtn.addEventListener('click', openSettings);
  els.settingsClose.addEventListener('click', () => { els.settingsSheet.hidden = true; });
  els.settingsCancel.addEventListener('click', () => { els.settingsSheet.hidden = true; });
  els.settingsSave.addEventListener('click', saveSettings);
}





