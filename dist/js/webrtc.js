const MAX_SIGNAL_LENGTH = 2_000_000;

function waitForIceGathering(peer, timeoutMs = 30_000) {
	if (peer.iceGatheringState === 'complete') return Promise.resolve();
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('ICE gathering timed out. Try again on a stable network.'));
		}, timeoutMs);
		const onStateChange = () => {
			if (peer.iceGatheringState === 'complete') {
				cleanup();
				resolve();
			}
		};
		const cleanup = () => {
			clearTimeout(timeout);
			peer.removeEventListener('icegatheringstatechange', onStateChange);
		};
		peer.addEventListener('icegatheringstatechange', onStateChange);
		onStateChange();
	});
}

function parseSignal(text, expectedType) {
	const normalized = text.trim();
	if (!normalized || normalized.length > MAX_SIGNAL_LENGTH) {
		throw new Error('Connection data is empty or too large.');
	}
	let description;
	try {
		description = JSON.parse(normalized);
	} catch {
		throw new Error('Connection data must be the full LocalDrop JSON offer or answer.');
	}
	if (description?.type !== expectedType || typeof description.sdp !== 'string') {
		throw new Error(`This data is not a valid ${expectedType}.`);
	}
	return description;
}

export class PeerConnection {
	constructor(onMessage, onState) {
		if (!('RTCPeerConnection' in window)) {
			throw new Error('This browser does not support WebRTC connections.');
		}
		this.peer = new RTCPeerConnection({ iceServers: [] });
		this.channel = null;
		this.onMessage = onMessage;
		this.onState = onState;
		this.peer.addEventListener('connectionstatechange', () => {
			this.onState(this.peer.connectionState);
		});
		this.peer.addEventListener('datachannel', ({ channel }) => this.attachChannel(channel));
	}

	attachChannel(channel) {
		this.channel = channel;
		channel.binaryType = 'arraybuffer';
		channel.bufferedAmountLowThreshold = 256 * 1024;
		channel.addEventListener('open', () => this.onState('connected'));
		channel.addEventListener('close', () => this.onState('disconnected'));
		channel.addEventListener('error', () => this.onState('failed'));
		channel.addEventListener('message', (event) => this.onMessage(event.data));
	}

	async createOffer() {
		this.attachChannel(this.peer.createDataChannel('localdrop', { ordered: true }));
		const offer = await this.peer.createOffer();
		await this.peer.setLocalDescription(offer);
		await waitForIceGathering(this.peer);
		return JSON.stringify(this.peer.localDescription);
	}

	async acceptOffer(text) {
		const offer = parseSignal(text, 'offer');
		await this.peer.setRemoteDescription(offer);
		const answer = await this.peer.createAnswer();
		await this.peer.setLocalDescription(answer);
		await waitForIceGathering(this.peer);
		return JSON.stringify(this.peer.localDescription);
	}

	async acceptAnswer(text) {
		await this.peer.setRemoteDescription(parseSignal(text, 'answer'));
	}

	send(data) {
		if (this.channel?.readyState !== 'open') throw new Error('The peer connection is not ready.');
		this.channel.send(data);
	}

	close() {
		this.channel?.close();
		this.peer.close();
	}
}
