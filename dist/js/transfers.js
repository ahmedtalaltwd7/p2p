import { saveHistory } from './storage.js';

const CHUNK_SIZE = 64 * 1024;
const MAX_BUFFERED_AMOUNT = 1024 * 1024;
const HEADER_SIZE = 20;

function waitForBuffer(channel) {
	if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			channel.removeEventListener('bufferedamountlow', onLow);
			reject(new Error('Transfer stalled while waiting for the connection to accept more data.'));
		}, 30_000);
		const onLow = () => {
			clearTimeout(timeout);
			resolve();
		};
		channel.addEventListener('bufferedamountlow', onLow, { once: true });
	});
}

function encodeChunk(id, index, bytes) {
	const frame = new Uint8Array(HEADER_SIZE + bytes.byteLength);
	for (let i = 0; i < 16; i += 1) frame[i] = Number.parseInt(id.slice(i * 2, i * 2 + 2), 16);
	new DataView(frame.buffer).setUint32(16, index);
	frame.set(new Uint8Array(bytes), HEADER_SIZE);
	return frame;
}

function decodeChunk(data) {
	const view = new DataView(data);
	const id = Array.from(new Uint8Array(data, 0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
	return { id, index: view.getUint32(16), bytes: data.slice(HEADER_SIZE) };
}

function transferId() {
	return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class TransferManager {
	constructor(getPeer, onUpdate) {
		this.getPeer = getPeer;
		this.onUpdate = onUpdate;
		this.transfers = new Map();
		this.queue = [];
		this.sending = false;
	}

	async sendFiles(files) {
		for (const file of files) {
			const id = transferId();
			const transfer = {
				id, file, name: file.name, size: file.size, type: file.type || 'application/octet-stream',
				status: 'waiting', direction: 'send', transferred: 0, startedAt: null
			};
			this.transfers.set(id, transfer);
			this.queue.push(id);
			this.getPeer().send(JSON.stringify({
				type: 'FILE_OFFER', id, name: file.name, size: file.size,
				mimeType: transfer.type, lastModified: file.lastModified
			}));
			this.onUpdate(transfer);
		}
		this.processQueue().catch((error) => this.failActive(error));
	}

	async processQueue() {
		if (this.sending) return;
		this.sending = true;
		try {
			while (this.queue.length) {
				const id = this.queue[0];
				const transfer = this.transfers.get(id);
				if (!transfer || transfer.status !== 'accepted') {
					if (transfer?.status === 'waiting') break;
					this.queue.shift();
					continue;
				}
				transfer.status = 'sending';
				transfer.startedAt = Date.now();
				this.onUpdate(transfer);
				const totalChunks = Math.ceil(transfer.size / CHUNK_SIZE);
				for (let index = 0; index < totalChunks; index += 1) {
					if (transfer.status === 'cancelled') break;
					const channel = this.getPeer().channel;
					await waitForBuffer(channel);
					const chunk = await transfer.file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE).arrayBuffer();
					this.getPeer().send(encodeChunk(id, index, chunk));
					transfer.transferred += chunk.byteLength;
					this.onUpdate(transfer);
				}
				if (transfer.status !== 'cancelled') {
					transfer.status = 'complete';
					this.getPeer().send(JSON.stringify({ type: 'FILE_COMPLETE', id, totalChunks }));
					await this.record(transfer);
					this.onUpdate(transfer);
				}
				this.queue.shift();
			}
		} finally {
			this.sending = false;
		}
	}

	async handleMessage(message) {
		if (typeof message !== 'string') {
			await this.handleChunk(message);
			return;
		}
		let packet;
		try {
			packet = JSON.parse(message);
		} catch {
			throw new Error('Received an invalid transfer message.');
		}
		if (packet.type === 'FILE_OFFER') {
			if (!packet.id || typeof packet.name !== 'string' || !Number.isSafeInteger(packet.size) || packet.size < 0) {
				throw new Error('Received invalid file metadata.');
			}
			const transfer = {
				...packet, direction: 'receive', status: 'pending', transferred: 0,
				chunks: new Array(Math.ceil(packet.size / CHUNK_SIZE))
			};
			this.transfers.set(packet.id, transfer);
			this.onUpdate(transfer);
			return;
		}
		const transfer = this.transfers.get(packet.id);
		if (!transfer) return;
		if (packet.type === 'FILE_ACCEPT' && transfer.direction === 'send' && transfer.status === 'waiting') {
			transfer.status = 'accepted';
			this.onUpdate(transfer);
			this.processQueue().catch((error) => this.failActive(error));
		} else if (packet.type === 'FILE_REJECT') {
			transfer.status = 'rejected';
			this.onUpdate(transfer);
			this.queue = this.queue.filter((id) => id !== transfer.id);
			this.processQueue().catch((error) => this.failActive(error));
		} else if (packet.type === 'FILE_CANCEL') {
			transfer.status = 'cancelled';
			this.onUpdate(transfer);
		} else if (packet.type === 'FILE_COMPLETE' && transfer.direction === 'receive') {
			await this.completeReceive(transfer, packet.totalChunks);
		} else if (packet.type === 'TRANSFER_ERROR') {
			transfer.status = 'failed';
			transfer.error = packet.message || 'The other device reported a transfer error.';
			this.onUpdate(transfer);
		}
	}

	async handleChunk(data) {
		if (data.byteLength < HEADER_SIZE) throw new Error('Received an invalid file chunk.');
		const { id, index, bytes } = decodeChunk(data);
		const transfer = this.transfers.get(id);
		if (!transfer || transfer.direction !== 'receive' || transfer.status !== 'receiving') return;
		if (index >= transfer.chunks.length || transfer.chunks[index]) {
			throw new Error('Received an unexpected or duplicate file chunk.');
		}
		if (transfer.writable) {
			await transfer.writable.write(bytes);
		} else {
			transfer.chunks[index] = bytes;
		}
		transfer.transferred += bytes.byteLength;
		this.onUpdate(transfer);
	}

	async accept(id) {
		const transfer = this.transfers.get(id);
		if (!transfer || transfer.status !== 'pending') return;
		if (typeof window.showSaveFilePicker === 'function') {
			const handle = await window.showSaveFilePicker({
				suggestedName: transfer.name,
				types: [{
					description: transfer.mimeType || 'File',
					accept: { [transfer.mimeType || 'application/octet-stream']: [`.${transfer.name.split('.').pop()}`] }
				}]
			});
			transfer.writable = await handle.createWritable();
		} else {
			transfer.chunks = new Array(Math.ceil(transfer.size / CHUNK_SIZE));
		}
		transfer.status = 'receiving';
		this.getPeer().send(JSON.stringify({ type: 'FILE_ACCEPT', id }));
		this.onUpdate(transfer);
	}

	reject(id) {
		const transfer = this.transfers.get(id);
		if (!transfer || transfer.status !== 'pending') return;
		transfer.status = 'rejected';
		this.getPeer().send(JSON.stringify({ type: 'FILE_REJECT', id }));
		this.onUpdate(transfer);
	}

	cancel(id) {
		const transfer = this.transfers.get(id);
		if (!transfer || ['complete', 'cancelled', 'failed', 'rejected'].includes(transfer.status)) return;
		transfer.status = 'cancelled';
		if (this.getPeer()?.channel?.readyState === 'open') this.getPeer().send(JSON.stringify({ type: 'FILE_CANCEL', id }));
		this.queue = this.queue.filter((queuedId) => queuedId !== id);
		this.onUpdate(transfer);
	}

	async completeReceive(transfer, totalChunks) {
		if (transfer.writable) {
			if (totalChunks !== Math.ceil(transfer.size / CHUNK_SIZE) || transfer.transferred !== transfer.size) {
				await transfer.writable.abort();
				throw new Error(`The received file "${transfer.name}" is incomplete.`);
			}
			await transfer.writable.close();
			transfer.savedToDisk = true;
		} else {
			if (totalChunks !== transfer.chunks.length || transfer.chunks.some((chunk) => !chunk)) {
				throw new Error(`The received file "${transfer.name}" is incomplete.`);
			}
			const blob = new Blob(transfer.chunks, { type: transfer.mimeType });
			if (blob.size !== transfer.size) {
				throw new Error(`The received file "${transfer.name}" reconstructed to ${blob.size} bytes; expected ${transfer.size}.`);
			}
			transfer.blob = blob;
		}
		transfer.status = 'complete';
		transfer.completedAt = Date.now();
		await this.record(transfer);
		this.onUpdate(transfer);
	}

	async failReceive(error) {
		const transfer = [...this.transfers.values()].find((item) => item.direction === 'receive' && item.status === 'receiving');
		if (!transfer) return;
		transfer.status = 'failed';
		transfer.error = error.message;
		try {
			await transfer.writable?.abort();
		} catch (abortError) {
			console.warn('Could not discard the incomplete received file.', abortError);
		}
		if (this.getPeer()?.channel?.readyState === 'open') {
			this.getPeer().send(JSON.stringify({ type: 'TRANSFER_ERROR', id: transfer.id, message: error.message }));
		}
		this.onUpdate(transfer);
	}

	async record(transfer) {
		transfer.completedAt = Date.now();
		await saveHistory({
			id: transfer.id, name: transfer.name, size: transfer.size, direction: transfer.direction,
			status: transfer.status, timestamp: transfer.completedAt
		});
	}

	failActive(error) {
		const active = [...this.transfers.values()].find((transfer) => transfer.status === 'sending');
		if (active) {
			active.status = 'failed';
			active.error = error.message;
			this.onUpdate(active);
		}
	}
}
