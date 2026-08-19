// IndexedDB persistence layer.
// Two object stores:
//   foods -> catalog of foods (keyPath: "name")
//   days  -> one record per day (keyPath: "date")

import { INITIAL_FOODS } from './foods.js';
import { oldestAllowedKey } from './utils.js';

const DB_NAME = 'caroly';
const DB_VERSION = 1;
const FOODS_STORE = 'foods';
const DAYS_STORE = 'days';

let dbPromise = null;

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Open the database, creating stores and seeding foods on first run. */
export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FOODS_STORE)) {
        db.createObjectStore(FOODS_STORE, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(DAYS_STORE)) {
        db.createObjectStore(DAYS_STORE, { keyPath: 'date' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).then(async (db) => {
    await seedFoodsIfEmpty(db);
    return db;
  });

  return dbPromise;
}

async function seedFoodsIfEmpty(db) {
  const tx = db.transaction(FOODS_STORE, 'readonly');
  const count = await requestAsPromise(tx.objectStore(FOODS_STORE).count());
  if (count > 0) return;

  const writeTx = db.transaction(FOODS_STORE, 'readwrite');
  const store = writeTx.objectStore(FOODS_STORE);
  for (const food of INITIAL_FOODS) store.put(food);
  await txDone(writeTx);
}

/** List all foods, sorted by name (Spanish locale). */
export async function listFoods() {
  const db = await openDB();
  const tx = db.transaction(FOODS_STORE, 'readonly');
  const foods = await requestAsPromise(tx.objectStore(FOODS_STORE).getAll());
  foods.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return foods;
}

/** Add a new food to the catalog (throws if the name already exists). */
export async function addFood(food) {
  const db = await openDB();

  const readTx = db.transaction(FOODS_STORE, 'readonly');
  const existing = await requestAsPromise(readTx.objectStore(FOODS_STORE).get(food.name));
  if (existing) {
    throw new Error(`The food "${food.name}" already exists.`);
  }

  const writeTx = db.transaction(FOODS_STORE, 'readwrite');
  writeTx.objectStore(FOODS_STORE).add(food);
  await txDone(writeTx);
  return food;
}

/** Get the record for a given day (or undefined if none). */
export async function getDay(dateKey) {
  const db = await openDB();
  const tx = db.transaction(DAYS_STORE, 'readonly');
  return requestAsPromise(tx.objectStore(DAYS_STORE).get(dateKey));
}

/** Persist a day record. */
export async function saveDay(day) {
  const db = await openDB();
  const tx = db.transaction(DAYS_STORE, 'readwrite');
  tx.objectStore(DAYS_STORE).put(day);
  await txDone(tx);
  return day;
}

/** Delete every day record older than the 7-day retention window. */
export async function cleanupOldDays(dateKey) {
  const db = await openDB();
  const oldest = oldestAllowedKey(dateKey);

  const readTx = db.transaction(DAYS_STORE, 'readonly');
  const keys = await requestAsPromise(readTx.objectStore(DAYS_STORE).getAllKeys());
  const toDelete = keys.filter((key) => key < oldest);

  if (toDelete.length === 0) return;

  const writeTx = db.transaction(DAYS_STORE, 'readwrite');
  const store = writeTx.objectStore(DAYS_STORE);
  for (const key of toDelete) store.delete(key);
  await txDone(writeTx);
}

/** Update an existing food in the catalog (handles renaming). */
export async function updateFood(oldName, food) {
  const db = await openDB();

  if (oldName !== food.name) {
    const readTx = db.transaction(FOODS_STORE, 'readonly');
    const existing = await requestAsPromise(readTx.objectStore(FOODS_STORE).get(food.name));
    if (existing) {
      throw new Error(`The food "${food.name}" already exists.`);
    }
  }

  const writeTx = db.transaction(FOODS_STORE, 'readwrite');
  const store = writeTx.objectStore(FOODS_STORE);
  if (oldName !== food.name) store.delete(oldName);
  store.put(food);
  await txDone(writeTx);
  return food;
}

/** Delete a food from the catalog. */
export async function deleteFood(name) {
  const db = await openDB();
  const tx = db.transaction(FOODS_STORE, 'readwrite');
  tx.objectStore(FOODS_STORE).delete(name);
  await txDone(tx);
}
