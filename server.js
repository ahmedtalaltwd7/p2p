import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';

const root = fileURLToPath(new URL('.', import.meta.url));
const dist = resolve(root, 'dist');
const production = process.argv.includes('--production');
const portArgument = process.argv.indexOf('--port');
const port = Number(process.env.PORT || (portArgument >= 0 ? process.argv[portArgument + 1] : 5173));
const host = process.env.HOST || '0.0.0.0';
const roomLifetimeMs = 5 * 60 * 1000;
const maxSignalBytes = 1_000_000;
const maxJoinAttempts = 12;
const maxCreateAttempts = 6;
const rateWindowMs = 60 * 1000;
const trustProxy = process.env.TRUST_PROXY === 'true';
const rooms = new Map();
const joinAttempts = new Map();
const createAttempts = new Map();

function send(socket, message) {
	if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function fail(socket, message) {
	send(socket, { type: 'error', message });
}

function isDescription(value, type) {
	return value && value.type === type && typeof value.sdp === 'string'
		&& value.sdp.length > 0 && value.sdp.length <= maxSignalBytes;
}

function removeRoom(code, message) {
	const room = rooms.get(code);
	if (!room) return;
	clearTimeout(room.timer);
	rooms.delete(code);
	if (message) {
		send(room.host, message);
		send(room.guest, message);
	}
}

function allowAttempt(attempts, address, limit) {
	const now = Date.now();
	let bucket = attempts.get(address);
	if (!bucket || now - bucket.start >= rateWindowMs) {
		bucket = { start: now, count: 0 };
		attempts.set(address, bucket);
	}
	if (bucket.count >= limit) return false;
	bucket.count += 1;
	if (attempts.size > 10_000) {
		for (const [key, value] of attempts) {
			if (now - value.start >= rateWindowMs) attempts.delete(key);
		}
	}
	return true;
}

function createRoom(socket, offer) {
	if (!allowAttempt(createAttempts, socket.peerAddress || 'unknown', maxCreateAttempts)) {
		fail(socket, 'Too many numbers created. Wait a minute and try again.');
		return;
	}
	let code;
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const candidate = String(randomInt(10_000_000, 100_000_000));
		if (!rooms.has(candidate)) {
			code = candidate;
			break;
		}
	}
	if (!code) {
		fail(socket, 'Could not create a pairing number. Please try again.');
		return;
	}

	const room = { host: socket, guest: null, timer: null };
	room.timer = setTimeout(() => {
		removeRoom(code, { type: 'expired', message: 'This pairing number expired. Create a new one.' });
	}, roomLifetimeMs);
	room.timer.unref();
	rooms.set(code, room);
	socket.role = 'host';
	socket.code = code;
	room.offer = offer;
	send(socket, { type: 'created', code, expiresIn: roomLifetimeMs / 1000 });
}

function handleMessage(socket, rawMessage) {
	let message;
	try {
		message = JSON.parse(rawMessage.toString());
	} catch {
		fail(socket, 'Invalid signaling message.');
		return;
	}

	if (socket.role === undefined) {
		if (message?.type === 'create') {
			if (!isDescription(message.offer, 'offer')) {
				fail(socket, 'Invalid connection offer.');
				return;
			}
			createRoom(socket, message.offer);
			return;
		}
		if (message?.type === 'join') {
			if (typeof message.code !== 'string' || !/^\d{8}$/.test(message.code)) {
				fail(socket, 'Enter the 8-digit number shown on the other device.');
				return;
			}
			if (!allowAttempt(joinAttempts, socket.peerAddress || 'unknown', maxJoinAttempts)) {
				fail(socket, 'Too many attempts. Wait a minute and try again.');
				return;
			}
			const room = rooms.get(message.code);
			if (!room || room.guest) {
				fail(socket, 'Number not found or already used. Check the number and try again.');
				return;
			}
			socket.role = 'guest';
			socket.code = message.code;
			room.guest = socket;
			send(room.host, { type: 'peer-joined' });
			send(socket, { type: 'offer', offer: room.offer });
			return;
		}
		fail(socket, 'Create a number or enter the number from the other device.');
		return;
	}

	const room = rooms.get(socket.code);
	if (!room) {
		fail(socket, 'This pairing number expired. Create a new one.');
		return;
	}
	if (socket.role === 'guest' && room.guest === socket && message?.type === 'answer') {
		if (!isDescription(message.answer, 'answer')) {
			fail(socket, 'Invalid connection answer.');
			return;
		}
		send(room.host, { type: 'answer', answer: message.answer });
		send(socket, { type: 'answer-sent' });
		removeRoom(socket.code);
		return;
	}
	if (socket.role === 'host' && room.host === socket && message?.type === 'cancel') {
		removeRoom(socket.code, { type: 'expired', message: 'The other device cancelled this pairing.' });
		return;
	}
	fail(socket, 'Unexpected signaling message.');
}

function handleDisconnect(socket) {
	if (socket.code === undefined) return;
	const room = rooms.get(socket.code);
	if (!room) return;
	if (socket.role === 'host' && room.host === socket) {
		removeRoom(socket.code, { type: 'expired', message: 'The other device ended this pairing.' });
	} else if (socket.role === 'guest' && room.guest === socket) {
		removeRoom(socket.code, { type: 'expired', message: 'The other device disconnected. Create a new number to try again.' });
	}
}

const wsServer = new WebSocketServer({ noServer: true, maxPayload: maxSignalBytes, perMessageDeflate: false });
wsServer.on('connection', (socket, request) => {
	const forwardedFor = request.headers['x-forwarded-for'];
	socket.peerAddress = trustProxy && typeof forwardedFor === 'string'
		? forwardedFor.split(',')[0].trim()
		: request.socket.remoteAddress;
	socket.on('message', (message) => handleMessage(socket, message));
	socket.on('close', () => handleDisconnect(socket));
	socket.on('error', (error) => console.error('Signaling socket error:', error));
});

function mimeType(path) {
	return ({
		'.css': 'text/css; charset=utf-8',
		'.html': 'text/html; charset=utf-8',
		'.ico': 'image/x-icon',
		'.js': 'text/javascript; charset=utf-8',
		'.json': 'application/json; charset=utf-8',
		'.png': 'image/png',
		'.svg': 'image/svg+xml',
		'.webmanifest': 'application/manifest+json; charset=utf-8',
		'.webp': 'image/webp',
		'.woff2': 'font/woff2',
	})[extname(path)] || 'application/octet-stream';
}

async function serveProduction(request, response) {
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		response.writeHead(405, { Allow: 'GET, HEAD' }).end();
		return;
	}
	let pathname;
	try {
		pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
	} catch {
		response.writeHead(400).end('Invalid URL');
		return;
	}
	const path = resolve(dist, `.${pathname}`);
	if (path !== dist && !path.startsWith(`${dist}${sep}`)) {
		response.writeHead(403).end('Forbidden');
		return;
	}
	let file = path;
	try {
		if (!(await stat(file)).isFile()) file = resolve(dist, 'index.html');
	} catch {
		file = resolve(dist, 'index.html');
	}
	response.writeHead(200, {
		'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600',
		'Content-Type': mimeType(file),
		'X-Content-Type-Options': 'nosniff',
	});
	if (request.method === 'HEAD') response.end();
	else createReadStream(file).pipe(response);
}

let vite;
const httpServer = createServer((request, response) => {
	if (production) {
		serveProduction(request, response).catch((error) => {
			console.error('Failed to serve the app:', error);
			if (!response.headersSent) response.writeHead(500);
			response.end('Internal server error');
		});
		return;
	}
	vite.middlewares(request, response, () => {
		response.writeHead(404).end('Not found');
	});
});

httpServer.on('upgrade', (request, socket, head) => {
	let pathname;
	try {
		pathname = new URL(request.url, 'http://localhost').pathname;
	} catch {
		socket.destroy();
		return;
	}
	let origin;
	try {
		origin = new URL(request.headers.origin);
	} catch {
		socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
		socket.destroy();
		return;
	}
	if (pathname !== '/api/signal' || origin.host !== request.headers.host) {
		socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
		socket.destroy();
		return;
	}
	wsServer.handleUpgrade(request, socket, head, (client) => {
		wsServer.emit('connection', client, request);
	});
});

if (!production) {
	const { createServer: createViteServer } = await import('vite');
	vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
}

httpServer.listen(port, host, () => {
	console.log(`LocalDrop ${production ? 'production' : 'development'} server listening on http://${host}:${port}`);
});

function shutdown() {
	for (const code of rooms.keys()) removeRoom(code);
	wsServer.close();
	httpServer.close(() => {
		vite?.close();
		process.exit(0);
	});
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
