// UI layer: page navigation, day view, food catalog management and voice input.

import {
  openDB,
  listFoods,
  addFood,
  updateFood,
  deleteFood,
  listRecipes,
  addRecipe,
  updateRecipe,
  deleteRecipe,
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
  pageRecipes: $('page-recipes'),
  recipesSearch: $('recipes-search'),
  recipesNewBtn: $('recipes-new-btn'),
  recipesList: $('recipes-list'),
  recipeForm: $('recipe-form'),
  recipeFormTitle: $('recipe-form-title'),
  recipeFormClose: $('recipe-form-close'),
  recipeFormCancel: $('recipe-form-cancel'),
  recipeFormSave: $('recipe-form-save'),
  recipeName: $('recipe-name'),
  recipeIngredients: $('recipe-ingredients'),
  recipeAddIngredient: $('recipe-add-ingredient'),
  recipeFormError: $('recipe-form-error'),
  recipeMealSheet: $('recipe-meal-sheet'),
  recipeMealOptions: $('recipe-meal-options'),
  recipeMealClose: $('recipe-meal-close'),
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
  pageSettings: $('page-settings'),
  settingsSave: $('settings-save'),
  settingsKey: $('settings-key'),
  settingsStatus: $('settings-status'),
  listeningSheet: $('listening-sheet'),
  listeningTitle: $('listening-title'),
  listeningText: $('listening-text'),
  listeningClose: $('listening-close'),
  listeningCancel: $('listening-cancel'),
};

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const state = {
  page: 'diary',
  currentDateKey: todayKey(),
  foods: [],
  recipes: [],
  day: null,
  pickerTarget: null,
  selectedFood: null,
  editingFood: null,
  foodFormOrigin: 'picker',
  voiceItems: [],
  editingEntry: null,
  recipeDraft: null,
  editingRecipeName: null,
  recipeMealTarget: null,
  listening: false,
  recognition: null,
};

init();

async function init() {
  await openDB();
  await cleanupOldDays(todayKey());
  state.foods = await listFoods();
  state.recipes = await listRecipes();
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
  els.pageRecipes.hidden = page !== 'recipes';
  els.pageSettings.hidden = page !== 'settings';
  document.querySelectorAll('.tab').forEach((tab) =>
    tab.classList.toggle('is-active', tab.dataset.page === page));
  if (page === 'diary') renderAll();
  if (page === 'foods') renderFoodsList(els.foodsSearch.value);
  if (page === 'recipes') renderRecipesList(els.recipesSearch.value);
  if (page === 'settings') loadSettingsKey();
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
    <li class="entry" data-type="${type}" data-id="${entry.id}" role="button" tabindex="0" aria-label="Editar cantidad de ${escapeHtml(entry.foodName)}">
      <div class="entry-main">
        <span class="entry-name">${escapeHtml(entry.foodName)}</span>
        <span class="entry-qty">${entry.quantity} ${entry.unit}</span>
      </div>
      <div class="entry-nutrition">${entry.kcal} kcal · P ${entry.protein} · C ${entry.carbs} · G ${entry.fat}</div>
      <span class="entry-edit" aria-hidden="true">✎</span>
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
  document.querySelectorAll('.entry[data-type]').forEach((li) =>
    li.addEventListener('click', (event) => {
      if (event.target.closest('.entry-delete')) return;
      const entry = state.day.meals[li.dataset.type].find((e) => e.id === li.dataset.id);
      if (entry) openQuantityEdit(li.dataset.type, entry);
    }));
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
  state.editingEntry = null;
  els.quantityConfirm.textContent = 'Añadir';
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

function openQuantityEdit(type, entry) {
  state.selectedFood = null;
  state.editingEntry = { type, id: entry.id };
  els.quantityConfirm.textContent = 'Guardar';
  els.quantityTitle.textContent = entry.foodName;

  const food = findFood(entry.foodName);
  if (food) {
    els.quantityInfo.innerHTML =
      `Por 100 ${food.unit}: ${food.per100.kcal} kcal · P ${food.per100.protein} · C ${food.per100.carbs} · G ${food.per100.fat}`;
  } else {
    els.quantityInfo.textContent = 'Este alimento ya no está en el catálogo.';
  }

  els.quantityLabel.textContent = `Cantidad (${entry.unit})`;
  els.quantityInput.value = entry.quantity;
  els.quantityResult.textContent = '';
  els.picker.hidden = true;
  els.quantityForm.hidden = false;
  els.quantityInput.focus();
  els.quantityInput.select();
  updateQuantityResult();
}

function updateQuantityResult() {
  const quantity = parseFloat(els.quantityInput.value);
  const n = Number.isNaN(quantity) || quantity <= 0 ? null : nutritionForEntryOrFood(quantity);
  els.quantityResult.textContent = n ? `${n.kcal} kcal · P ${n.protein} · C ${n.carbs} · G ${n.fat}` : '';
}

function nutritionForEntryOrFood(quantity) {
  if (state.editingEntry) {
    const { type, id } = state.editingEntry;
    const entry = state.day.meals[type].find((e) => e.id === id);
    const food = entry && findFood(entry.foodName);
    if (food) return nutritionForQuantity(food.per100, quantity);
    if (entry) {
      const factor = quantity / entry.quantity;
      return {
        kcal: round1(entry.kcal * factor),
        protein: round1(entry.protein * factor),
        carbs: round1(entry.carbs * factor),
        fat: round1(entry.fat * factor),
      };
    }
    return null;
  }
  return state.selectedFood ? nutritionForQuantity(state.selectedFood.per100, quantity) : null;
}

async function confirmQuantity() {
  const quantity = parseFloat(els.quantityInput.value);
  if (Number.isNaN(quantity) || quantity <= 0) return;

  if (state.editingEntry) {
    updateEntryQuantity(state.editingEntry, quantity);
  } else if (state.recipeDraft && state.selectedFood) {
    addIngredientToRecipeDraft(state.selectedFood, quantity);
    backToRecipeForm();
    return;
  } else if (state.selectedFood) {
    addEntryToMeal(state.pickerTarget, state.selectedFood, quantity);
  } else {
    return;
  }
  await persistDay();
  closeAllOverlays();
  renderAll();
}

function addEntryToMeal(type, food, quantity) {
  pushEntryToMeal(type, entryDataFromFood(food, quantity));
}

function entryDataFromFood(food, quantity) {
  const n = nutritionForQuantity(food.per100, quantity);
  return {
    foodName: food.name,
    quantity: round1(quantity),
    unit: food.unit,
    kcal: n.kcal,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
  };
}

function pushEntryToMeal(type, entryData) {
  state.day.meals[type].push({ id: uid(), ...entryData });
}

function updateEntryQuantity({ type, id }, quantity) {
  const entry = state.day.meals[type].find((e) => e.id === id);
  if (!entry) return;
  const food = findFood(entry.foodName);
  const n = food
    ? nutritionForQuantity(food.per100, quantity)
    : {
        kcal: round1(entry.kcal * quantity / entry.quantity),
        protein: round1(entry.protein * quantity / entry.quantity),
        carbs: round1(entry.carbs * quantity / entry.quantity),
        fat: round1(entry.fat * quantity / entry.quantity),
      };
  entry.quantity = round1(quantity);
  entry.unit = food ? food.unit : entry.unit;
  entry.kcal = n.kcal;
  entry.protein = n.protein;
  entry.carbs = n.carbs;
  entry.fat = n.fat;
}

function resetQuantityForm() {
  state.editingEntry = null;
  state.selectedFood = null;
  els.quantityConfirm.textContent = 'Añadir';
}

function closeQuantityForm() {
  const wasEditing = !!state.editingEntry;
  const wasRecipe = !wasEditing && !!state.recipeDraft;
  resetQuantityForm();
  if (wasEditing) {
    closeAllOverlays();
  } else if (wasRecipe) {
    backToRecipeForm();
  } else {
    backToPicker();
  }
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

// ----- Recipes page -----

function renderRecipesList(query) {
  const q = query.trim().toLowerCase();
  const filtered = state.recipes.filter((r) => r.name.toLowerCase().includes(q));
  els.recipesList.innerHTML = '';
  if (filtered.length === 0) {
    els.recipesList.innerHTML = '<li class="empty">Sin recetas</li>';
    return;
  }
  for (const recipe of filtered) {
    const totals = sumNutrition(recipe.ingredients);
    const li = document.createElement('li');
    li.className = 'foods-item';
    li.innerHTML = `
      <div class="foods-item-main">
        <div class="food-name">${escapeHtml(recipe.name)}</div>
        <div class="food-per100">${totals.kcal} kcal · P ${totals.protein} · C ${totals.carbs} · G ${totals.fat} · ${recipe.ingredients.length} ingred.</div>
      </div>
      <div class="recipe-actions">
        <button class="btn btn-primary recipe-add" data-name="${escapeHtml(recipe.name)}" type="button" aria-label="Añadir al diario">＋</button>
        <button class="foods-item-delete" data-name="${escapeHtml(recipe.name)}" aria-label="Eliminar">🗑</button>
      </div>`;
    li.addEventListener('click', (e) => {
      if (e.target.closest('.recipe-add')) return;
      if (e.target.closest('.foods-item-delete')) return;
      openRecipeForm(recipe);
    });
    els.recipesList.appendChild(li);
  }
  els.recipesList.querySelectorAll('.recipe-add').forEach((btn) =>
    btn.addEventListener('click', () => openRecipeMealSheet(btn.dataset.name)));
  els.recipesList.querySelectorAll('.foods-item-delete').forEach((btn) =>
    btn.addEventListener('click', () => deleteRecipeByName(btn.dataset.name)));
}

async function deleteRecipeByName(name) {
  if (!window.confirm(`¿Eliminar la receta "${name}"?`)) return;
  await deleteRecipe(name);
  state.recipes = await listRecipes();
  renderRecipesList(els.recipesSearch.value);
}

// ----- Recipe editor -----

function openRecipeForm(existing) {
  state.editingRecipeName = existing ? existing.name : null;
  state.recipeDraft = {
    name: existing ? existing.name : '',
    ingredients: existing ? existing.ingredients.map((i) => ({ ...i })) : [],
  };
  els.recipeFormTitle.textContent = existing ? 'Editar receta' : 'Nueva receta';
  els.recipeName.value = state.recipeDraft.name;
  els.recipeFormError.hidden = true;
  renderRecipeIngredients();
  els.recipeForm.hidden = false;
}

function closeRecipeForm() {
  els.recipeForm.hidden = true;
  state.recipeDraft = null;
  state.editingRecipeName = null;
  if (state.page === 'recipes') renderRecipesList(els.recipesSearch.value);
}

function renderRecipeIngredients() {
  const list = els.recipeIngredients;
  list.innerHTML = '';
  if (!state.recipeDraft) return;
  if (state.recipeDraft.ingredients.length === 0) {
    list.innerHTML = '<li class="empty">Sin ingredientes</li>';
    return;
  }
  state.recipeDraft.ingredients.forEach((ing, index) => {
    const li = document.createElement('li');
    li.className = 'entry';
    li.innerHTML = `
      <div class="entry-main">
        <span class="entry-name">${escapeHtml(ing.foodName)}</span>
        <span class="entry-qty">${ing.quantity} ${ing.unit}</span>
      </div>
      <div class="entry-nutrition">${ing.kcal} kcal · P ${ing.protein} · C ${ing.carbs} · G ${ing.fat}</div>
      <button class="entry-delete" data-index="${index}" type="button" aria-label="Quitar ingrediente">✕</button>`;
    li.querySelector('.entry-delete').addEventListener('click', () => {
      state.recipeDraft.ingredients.splice(index, 1);
      renderRecipeIngredients();
    });
    list.appendChild(li);
  });
}

function showRecipeError(message) {
  els.recipeFormError.textContent = message;
  els.recipeFormError.hidden = false;
}

async function saveRecipe() {
  if (!state.recipeDraft) return;
  const name = els.recipeName.value.trim();
  if (!name) {
    showRecipeError('Introduce un nombre.');
    return;
  }
  if (state.recipeDraft.ingredients.length === 0) {
    showRecipeError('Añade al menos un ingrediente.');
    return;
  }
  const recipe = { name, ingredients: state.recipeDraft.ingredients };
  try {
    if (state.editingRecipeName) {
      await updateRecipe(state.editingRecipeName, recipe);
    } else {
      await addRecipe(recipe);
    }
    state.recipes = await listRecipes();
    els.recipeForm.hidden = true;
    state.recipeDraft = null;
    state.editingRecipeName = null;
    renderRecipesList(els.recipesSearch.value);
  } catch (err) {
    showRecipeError(err.message);
  }
}

function openPickerForRecipe() {
  state.pickerTarget = null;
  els.pickerTitle.textContent = 'Añadir ingrediente';
  els.pickerSearch.value = '';
  renderPickerList('');
  els.recipeForm.hidden = true;
  els.picker.hidden = false;
}

function backToRecipeForm() {
  els.picker.hidden = true;
  els.quantityForm.hidden = true;
  els.recipeForm.hidden = false;
  renderRecipeIngredients();
}

function addIngredientToRecipeDraft(food, quantity) {
  state.recipeDraft.ingredients.push(entryDataFromFood(food, quantity));
}

// ----- Add recipe to a meal -----

function openRecipeMealSheet(recipeName) {
  state.recipeMealTarget = recipeName;
  els.recipeMealOptions.innerHTML = '';
  for (const type of MEAL_TYPES) {
    const btn = document.createElement('button');
    btn.className = 'btn meal-option';
    btn.type = 'button';
    btn.textContent = MEAL_LABELS[type];
    btn.addEventListener('click', () => addRecipeToMeal(recipeName, type));
    els.recipeMealOptions.appendChild(btn);
  }
  els.recipeMealSheet.hidden = false;
}

async function addRecipeToMeal(recipeName, type) {
  const recipe = state.recipes.find((r) => r.name === recipeName);
  if (!recipe) return;
  for (const ingredient of recipe.ingredients) {
    pushEntryToMeal(type, { ...ingredient });
  }
  await persistDay();
  els.recipeMealSheet.hidden = true;
  if (state.page !== 'diary') switchPage('diary');
  renderAll();
}

// ----- Voice input -----

function getRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.interimResults = true;
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

function openListeningSheet() {
  els.listeningSheet.hidden = false;
}

function closeListeningSheet() {
  els.listeningSheet.hidden = true;
}

function cancelListening() {
  state.listening = false;
  toggleMicListening(false);
  if (state.recognition) {
    try { state.recognition.abort(); } catch { /* ignore */ }
    state.recognition = null;
  }
  closeListeningSheet();
}

function startVoice() {
  if (state.listening) return;
  const recognition = getRecognition();
  if (!recognition) {
    window.alert('Tu navegador no soporta reconocimiento de voz. Usa Safari o Chrome actualizados.');
    return;
  }
  state.recognition = recognition;
  state.listening = true;
  toggleMicListening(true);
  els.listeningTitle.textContent = 'Escuchando…';
  els.listeningText.textContent = 'Habla ahora…';
  openListeningSheet();

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) final += result[0].transcript;
      else interim += result[0].transcript;
    }
    if (final) {
      closeListeningSheet();
      handleVoiceTranscript(final.trim());
    } else if (interim) {
      els.listeningText.textContent = interim;
    }
  };

  recognition.onerror = (event) => {
    state.listening = false;
    toggleMicListening(false);
    state.recognition = null;
    if (event.error === 'aborted') {
      closeListeningSheet();
      return;
    }
    if (event.error === 'no-speech') {
      els.listeningText.textContent = 'No he detectado voz. Pulsa Cancelar o vuelve a intentarlo.';
      return;
    }
    closeListeningSheet();
    if (event.error === 'not-allowed') {
      window.alert('Permiso de micrófono denegado. Actívalo en Ajustes → Privacidad → Micrófono.');
      return;
    }
    window.alert(`Error de voz: ${event.error}`);
  };

  recognition.onend = () => {
    state.listening = false;
    toggleMicListening(false);
    state.recognition = null;
  };

  recognition.start();
}

async function handleVoiceTranscript(transcript) {
  closeListeningSheet();
  els.voiceTranscript.textContent = transcript;
  els.voiceError.hidden = true;
  els.voiceItems.innerHTML = '<li class="empty">Interpretando…</li>';
  els.voiceMeal.value = 'comida';
  openVoiceSheet();

  try {
    const parsed = await extractFoodsFromText(transcript, state.foods, state.recipes);
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
  if (!parsed) return items;

  if (Array.isArray(parsed.items)) {
    for (const item of parsed.items) {
      const food = findFood(item.foodName);
      const quantity = parseFloat(item.quantity);
      if (!food || Number.isNaN(quantity) || quantity <= 0) continue;
      items.push(entryDataFromFood(food, quantity));
    }
  }

  if (Array.isArray(parsed.recipes)) {
    for (const r of parsed.recipes) {
      const recipe = state.recipes.find((x) => x.name === r.recipeName);
      if (!recipe) continue;
      const servings = Math.max(parseFloat(r.servings) || 1, 0.1);
      for (const ing of recipe.ingredients) {
        items.push({
          foodName: ing.foodName,
          quantity: round1(ing.quantity * servings),
          unit: ing.unit,
          kcal: round1(ing.kcal * servings),
          protein: round1(ing.protein * servings),
          carbs: round1(ing.carbs * servings),
          fat: round1(ing.fat * servings),
        });
      }
    }
  }

  return items;
}

function renderVoiceItems(items) {
  els.voiceItems.innerHTML = '';
  if (items.length === 0) {
    els.voiceItems.innerHTML = '<li class="empty">No he encontrado alimentos ni recetas en el texto.</li>';
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'entry';
    li.innerHTML = `
      <div class="entry-main">
        <span class="entry-name">${escapeHtml(item.foodName)}</span>
        <span class="entry-qty">${item.quantity} ${item.unit}</span>
      </div>
      <div class="entry-nutrition">${item.kcal} kcal · P ${item.protein} · C ${item.carbs} · G ${item.fat}</div>`;
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
    pushEntryToMeal(type, item);
  }
  await persistDay();
  closeVoiceSheet();
  renderAll();
}

// ----- Settings -----

function loadSettingsKey() {
  try {
    els.settingsKey.value = localStorage.getItem('caroly.deepseekKey') || '';
  } catch {
    els.settingsKey.value = '';
  }
  els.settingsStatus.textContent = '';
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
  resetQuantityForm();
  [els.picker, els.foodForm, els.quantityForm, els.voiceSheet].forEach((o) => {
    o.hidden = true;
  });
}

function backToPicker() {
  resetQuantityForm();
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

  els.pickerClose.addEventListener('click', () => {
    if (state.recipeDraft) backToRecipeForm();
    else closeAllOverlays();
  });
  els.pickerSearch.addEventListener('input', () => renderPickerList(els.pickerSearch.value));
  els.newFoodBtn.addEventListener('click', () => openFoodForm('picker'));

  els.foodFormClose.addEventListener('click', afterFoodFormClose);
  els.foodFormCancel.addEventListener('click', afterFoodFormClose);
  els.newFoodForm.addEventListener('submit', submitFoodForm);

  els.quantityClose.addEventListener('click', closeQuantityForm);
  els.quantityCancel.addEventListener('click', closeQuantityForm);
  els.quantityConfirm.addEventListener('click', confirmQuantity);
  els.quantityInput.addEventListener('input', updateQuantityResult);

  els.foodsSearch.addEventListener('input', () => renderFoodsList(els.foodsSearch.value));
  els.foodsNewBtn.addEventListener('click', () => openFoodForm('foods'));

  els.recipesSearch.addEventListener('input', () => renderRecipesList(els.recipesSearch.value));
  els.recipesNewBtn.addEventListener('click', () => openRecipeForm(null));
  els.recipeFormClose.addEventListener('click', closeRecipeForm);
  els.recipeFormCancel.addEventListener('click', closeRecipeForm);
  els.recipeFormSave.addEventListener('click', saveRecipe);
  els.recipeAddIngredient.addEventListener('click', openPickerForRecipe);
  els.recipeMealClose.addEventListener('click', () => { els.recipeMealSheet.hidden = true; });

  els.micBtn.addEventListener('click', startVoice);
  els.voiceClose.addEventListener('click', closeVoiceSheet);
  els.voiceRetry.addEventListener('click', () => { closeVoiceSheet(); startVoice(); });
  els.voiceConfirm.addEventListener('click', confirmVoice);

  els.settingsSave.addEventListener('click', saveSettings);

  els.listeningClose.addEventListener('click', cancelListening);
  els.listeningCancel.addEventListener('click', cancelListening);

  // Touch feedback for list items (fallback for :active on iOS).
  document.addEventListener('pointerdown', (event) => {
    const item = event.target.closest('.food-item, .foods-item, .entry[data-type]');
    if (item) item.classList.add('is-pressed');
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) =>
    document.addEventListener(type, () => {
      document.querySelectorAll('.is-pressed').forEach((el) => el.classList.remove('is-pressed'));
    }));
}





