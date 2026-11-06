const DB_NAME = 'localdrop';
const DB_VERSION = 1;
let dbPromise;

function openDatabase() {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const database = request.result;
			database.createObjectStore('history', { keyPath: 'id' });
			database.createObjectStore('preferences', { keyPath: 'key' });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Could not open LocalDrop storage.'));
	});
	return dbPromise;
}

export async function saveHistory(item) {
	const database = await openDatabase();
	await new Promise((resolve, reject) => {
		const request = database.transaction('history', 'readwrite').objectStore('history').put(item);
		request.onsuccess = resolve;
		request.onerror = () => reject(request.error ?? new Error('Could not save transfer history.'));
	});
}

export async function getHistory() {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const request = database.transaction('history').objectStore('history').getAll();
		request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
		request.onerror = () => reject(request.error ?? new Error('Could not load transfer history.'));
	});
}

export async function clearHistory() {
	const database = await openDatabase();
	await new Promise((resolve, reject) => {
		const request = database.transaction('history', 'readwrite').objectStore('history').clear();
		request.onsuccess = resolve;
		request.onerror = () => reject(request.error ?? new Error('Could not clear transfer history.'));
	});
}

export async function getPreference(key, fallback) {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const request = database.transaction('preferences').objectStore('preferences').get(key);
		request.onsuccess = () => resolve(request.result?.value ?? fallback);
		request.onerror = () => reject(request.error ?? new Error('Could not load preferences.'));
	});
}

export async function setPreference(key, value) {
	const database = await openDatabase();
	await new Promise((resolve, reject) => {
		const request = database.transaction('preferences', 'readwrite')
			.objectStore('preferences').put({ key, value });
		request.onsuccess = resolve;
		request.onerror = () => reject(request.error ?? new Error('Could not save preferences.'));
	});
}
