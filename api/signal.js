import { randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { Redis } from '@upstash/redis';
import { WebSocket, WebSocketServer } from 'ws';

const roomLifetimeSeconds = 5 * 60;
const maxSignalBytes = 1_000_000;
const maxJoinAttempts = 12;
const maxCreateAttempts = 6;
const rateWindowSeconds = 60;
const server = createServer((request, response) => {
	response.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' });
	response.end('WebSocket connection required.');
});
let redis;

function getRedis() {
	const hasUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
	const hasToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
	if (!hasUrl || !hasToken) {
		throw new Error('Pairing is not configured. Connect an Upstash Redis database to this Vercel project.');
	}
	redis ||= Redis.fromEnv();
	return redis;
}

function send(socket, message) {
	if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function fail(socket, message) {
	send(socket, { type: 'error', message });
}

function isDescription(value, type) {
	return value && value.type === type && typeof value.sdp === 'string'
		&& value.sdp.length > 0 && value.sdp.length <= maxSignalBytes;
}

function roomKeys(code) {
	return {
		room: `localdrop:pair:${code}`,
		joined: `localdrop:pair:${code}:joined`,
		answer: `localdrop:pair:${code}:answer`,
	};
}

function ttlFor(room) {
	return Math.max(1, Math.ceil((room.expiresAt - Date.now()) / 1000));
}

async function removeRoom(code) {
	const redisClient = getRedis();
	const keys = roomKeys(code);
	await redisClient.del(keys.room, keys.joined, keys.answer);
}

async function allowAttempt(redisClient, address, type, limit) {
	const key = `localdrop:rate:${type}:${address}`;
	const attempts = await redisClient.incr(key);
	if (attempts === 1) await redisClient.expire(key, rateWindowSeconds);
	return attempts <= limit;
}

async function createRoom(socket, offer) {
	const redisClient = getRedis();
	const address = socket.peerAddress || 'unknown';
	if (!await allowAttempt(redisClient, address, 'create', maxCreateAttempts)) {
		fail(socket, 'Too many numbers created. Wait a minute and try again.');
		return;
	}

	for (let attempt = 0; attempt < 10; attempt += 1) {
		const code = String(randomInt(10_000_000, 100_000_000));
		const keys = roomKeys(code);
		const room = { offer, expiresAt: Date.now() + roomLifetimeSeconds * 1000 };
		const created = await redisClient.set(keys.room, room, { ex: roomLifetimeSeconds, nx: true });
		if (created !== 'OK') continue;
		socket.role = 'host';
		socket.code = code;
		send(socket, { type: 'created', code, expiresIn: roomLifetimeSeconds });
		pollRoom(socket);
		return;
	}
	fail(socket, 'Could not create a pairing number. Please try again.');
}

async function joinRoom(socket, code) {
	const redisClient = getRedis();
	const address = socket.peerAddress || 'unknown';
	if (!await allowAttempt(redisClient, address, 'join', maxJoinAttempts)) {
		fail(socket, 'Too many attempts. Wait a minute and try again.');
		return;
	}
	const keys = roomKeys(code);
	const room = await redisClient.get(keys.room);
	if (!room || room.expiresAt <= Date.now()) {
		fail(socket, 'Number not found or already used. Check the number and try again.');
		return;
	}
	const claimed = await redisClient.set(keys.joined, '1', { ex: ttlFor(room), nx: true });
	if (claimed !== 'OK') {
		fail(socket, 'Number not found or already used. Check the number and try again.');
		return;
	}
	const currentRoom = await redisClient.get(keys.room);
	if (!currentRoom || currentRoom.expiresAt <= Date.now()) {
		await redisClient.del(keys.joined);
		fail(socket, 'Number not found or already used. Check the number and try again.');
		return;
	}
	socket.role = 'guest';
	socket.code = code;
	send(socket, { type: 'offer', offer: currentRoom.offer });
}

async function pollRoom(socket) {
	if (socket.role !== 'host' || socket.readyState !== WebSocket.OPEN) return;
	try {
		const redisClient = getRedis();
		const keys = roomKeys(socket.code);
		const room = await redisClient.get(keys.room);
		if (!room || room.expiresAt <= Date.now()) {
			fail(socket, 'This pairing number expired. Create a new one.');
			socket.close(1000);
			return;
		}
		if (!socket.peerJoined && await redisClient.get(keys.joined)) {
			socket.peerJoined = true;
			send(socket, { type: 'peer-joined' });
		}
		const answer = await redisClient.get(keys.answer);
		if (answer) {
			send(socket, { type: 'answer', answer });
			await removeRoom(socket.code);
			socket.close(1000);
			return;
		}
		socket.pollTimer = setTimeout(() => pollRoom(socket), 750);
	} catch (error) {
		console.error('Vercel signaling poll failed:', error);
		fail(socket, 'Pairing service is temporarily unavailable. Please try again.');
		socket.close(1011);
	}
}

async function handleMessage(socket, rawMessage) {
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
			await createRoom(socket, message.offer);
			return;
		}
		if (message?.type === 'join') {
			if (typeof message.code !== 'string' || !/^\d{8}$/.test(message.code)) {
				fail(socket, 'Enter the 8-digit number shown on the other device.');
				return;
			}
			await joinRoom(socket, message.code);
			return;
		}
		fail(socket, 'Create a number or enter the number from the other device.');
		return;
	}

	if (socket.role === 'guest' && message?.type === 'answer') {
		if (!isDescription(message.answer, 'answer')) {
			fail(socket, 'Invalid connection answer.');
			return;
		}
		const redisClient = getRedis();
		const keys = roomKeys(socket.code);
		const room = await redisClient.get(keys.room);
		if (!room || room.expiresAt <= Date.now() || !await redisClient.get(keys.joined)) {
			fail(socket, 'This pairing number expired. Create a new one.');
			return;
		}
		const saved = await redisClient.set(keys.answer, message.answer, { ex: ttlFor(room), nx: true });
		if (saved !== 'OK') {
			fail(socket, 'This pairing number has already been used.');
			return;
		}
		send(socket, { type: 'answer-sent' });
		return;
	}

	if (socket.role === 'host' && message?.type === 'cancel') {
		await removeRoom(socket.code);
		send(socket, { type: 'expired', message: 'The other device cancelled this pairing.' });
		return;
	}
	fail(socket, 'Unexpected signaling message.');
}

const wsServer = new WebSocketServer({
	server,
	path: '/api/signal',
	maxPayload: maxSignalBytes,
	perMessageDeflate: false,
	verifyClient(info, callback) {
		try {
			callback(new URL(info.origin).host === info.req.headers.host, 403, 'Invalid origin.');
		} catch {
			callback(false, 403, 'Invalid origin.');
		}
	},
});

wsServer.on('connection', (socket, request) => {
	const forwardedFor = request.headers['x-forwarded-for'];
	socket.peerAddress = typeof forwardedFor === 'string'
		? forwardedFor.split(',')[0].trim()
		: request.socket.remoteAddress;
	socket.on('message', (message) => {
		handleMessage(socket, message).catch((error) => {
			console.error('Vercel signaling request failed:', error);
			fail(socket, error.message.startsWith('Pairing is not configured.')
				? error.message
				: 'Pairing service is temporarily unavailable. Please try again.');
		});
	});
	socket.on('close', () => {
		clearTimeout(socket.pollTimer);
		if (socket.role === 'host') {
			removeRoom(socket.code).catch((error) => console.error('Failed to remove pairing room:', error));
		} else if (socket.role === 'guest' && socket.code) {
			const keys = roomKeys(socket.code);
			getRedis().get(keys.answer).then((answer) => {
				if (!answer) return removeRoom(socket.code);
			}).catch((error) => console.error('Failed to clean up pairing room:', error));
		}
	});
	socket.on('error', (error) => console.error('Vercel signaling socket error:', error));
});

export default server;
