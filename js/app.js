// UI layer: renders the day view and wires up the food/quantity flows.

import {
  openDB,
  listFoods,
  addFood,
  getDay,
  saveDay,
  cleanupOldDays,
} from './db.js';
import { MEAL_TYPES, MEAL_LABELS } from './foods.js';
import {
  todayKey,
  addDays,
  nutritionForQuantity,
  sumNutrition,
  round1,
} from './utils.js';

const $ = (id) => document.getElementById(id);

const els = {
  prevDay: $('prev-day'),
  nextDay: $('next-day'),
  dateText: $('date-text'),
  dateSubtext: $('date-subtext'),
  summary: $('summary'),
  meals: $('meals'),
  picker: $('picker'),
  pickerTitle: $('picker-title'),
  pickerClose: $('picker-close'),
  pickerSearch: $('picker-search'),
  newFoodBtn: $('new-food-btn'),
  pickerList: $('picker-list'),
  foodForm: $('food-form'),
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
};

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const state = {
  currentDateKey: todayKey(),
  foods: [],
  day: null,
  pickerTarget: null,
  selectedFood: null,
};

init();

async function init() {
  await openDB();
  await cleanupOldDays(todayKey());
  state.foods = await listFoods();
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

// ----- Rendering -----

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

// ----- Actions -----

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

  const n = nutritionForQuantity(food.per100, quantity);
  state.day.meals[state.pickerTarget].push({
    id: uid(),
    foodName: food.name,
    quantity: round1(quantity),
    unit: food.unit,
    kcal: n.kcal,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
  });

  await persistDay();
  closeAll();
  renderAll();
}

// ----- New food form -----

function openFoodForm() {
  resetFoodForm();
  els.picker.hidden = true;
  els.foodForm.hidden = false;
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
    const food = await addFood({ name, unit, per100 });
    state.foods.push(food);
    state.foods.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    els.foodForm.hidden = true;
    openQuantity(food);
  } catch (err) {
    showFoodError(err.message);
  }
}

// ----- Overlay helpers -----

function closeAll() {
  [els.picker, els.foodForm, els.quantityForm].forEach((o) => { o.hidden = true; });
}

function backToPicker() {
  els.foodForm.hidden = true;
  els.quantityForm.hidden = true;
  els.picker.hidden = false;
  renderPickerList(els.pickerSearch.value);
}

// ----- Event bindings -----

function bindEvents() {
  els.prevDay.addEventListener('click', () => navigate(-1));
  els.nextDay.addEventListener('click', () => navigate(1));

  els.pickerClose.addEventListener('click', closeAll);
  els.pickerSearch.addEventListener('input', () => renderPickerList(els.pickerSearch.value));
  els.newFoodBtn.addEventListener('click', openFoodForm);

  els.foodFormClose.addEventListener('click', backToPicker);
  els.foodFormCancel.addEventListener('click', backToPicker);
  els.newFoodForm.addEventListener('submit', submitFoodForm);

  els.quantityClose.addEventListener('click', backToPicker);
  els.quantityCancel.addEventListener('click', backToPicker);
  els.quantityConfirm.addEventListener('click', confirmQuantity);
  els.quantityInput.addEventListener('input', updateQuantityResult);
}

