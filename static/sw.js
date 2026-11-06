const CACHE_NAME = 'localdrop-shell-v4';
const APP_SHELL = ['/', '/styles.css', '/app.js', '/js/signaling.js', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
			)
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
	event.respondWith(
		fetch(event.request)
			.then((response) => {
				if (response.ok && response.type === 'basic') {
					const copy = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
				}
				return response;
			})
			.catch(async () => {
				const cached = await caches.match(event.request);
				if (cached) return cached;
				if (event.request.mode === 'navigate') {
					const appShell = await caches.match('/');
					if (appShell) return appShell;
				}
				throw new Error(`LocalDrop has no offline copy of ${event.request.url}.`);
			})
	);
});
