export class SignalingConnection {
	constructor(onMessage, onClose, onError) {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		this.socket = new WebSocket(`${protocol}//${window.location.host}/signal`);
		this.ready = new Promise((resolve, reject) => {
			let opened = false;
			const timeout = setTimeout(() => {
				this.socket.close();
				reject(new Error('The signaling server did not respond. Please try again.'));
			}, 10_000);
			this.socket.addEventListener('open', () => {
				opened = true;
				clearTimeout(timeout);
				resolve();
			}, { once: true });
			this.socket.addEventListener('error', () => {
				const error = new Error('Could not reach the signaling server. Please try again.');
				if (!opened) {
					clearTimeout(timeout);
					reject(error);
				} else {
					onError(error);
				}
			});
			this.socket.addEventListener('close', (event) => {
				clearTimeout(timeout);
				if (!opened) reject(new Error('Could not connect to the signaling server.'));
				else onClose(event);
			});
			this.socket.addEventListener('message', (event) => {
				try {
					const message = JSON.parse(event.data);
					Promise.resolve(onMessage(message)).catch(onError);
				} catch (error) {
					onError(new Error(`Invalid message from the signaling server: ${error.message}`));
				}
			});
		});
	}

	async send(message) {
		await this.ready;
		if (this.socket.readyState !== WebSocket.OPEN) {
			throw new Error('The signaling connection has closed. Please try again.');
		}
		this.socket.send(JSON.stringify(message));
	}

	close() {
		if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
			this.socket.close();
		}
	}
}
