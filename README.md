# LocalDrop

LocalDrop is a browser-based, peer-to-peer file transfer prototype. Its
interface, WebRTC connection layer, chunked transfer protocol, local transfer
history, and PWA app shell are implemented with browser APIs and vanilla
JavaScript.

```sh
npm install
npm run dev
```

Create a production build with `npm run build`, then run it with `npm start`.
The development and production servers provide both the app and its signaling
WebSocket endpoint. Deploy them together on a Node.js host that supports
WebSockets; a static-only host is not sufficient. Set `PORT` if the host
requires a specific port. If a trusted reverse proxy overwrites
`X-Forwarded-For`, set `TRUST_PROXY=true` so pairing-attempt limits use the
client address. The app must be served over HTTPS in production for secure
browser APIs and WebSockets.

## Connecting devices

1. Open LocalDrop on both devices.
2. On the first device, choose **Create connection number**.
3. Enter the displayed eight-digit number on the second device. The connection
   is negotiated automatically.

The signaling server temporarily relays the WebRTC offer and answer in memory;
it does not receive file contents or save pairing data. Eight-digit numbers
expire after five minutes and can only be used once. Share them only with the
device you intend to connect. No STUN or TURN server is configured, so NAT,
browser network privacy, Wi-Fi isolation, and network policy may still prevent
a direct connection, especially across different networks.

## Transfer behavior

- Files are sent as 64 KiB ordered data-channel chunks with buffered-amount
  backpressure.
- The receiver accepts each file individually. Where supported, the browser
  prompts for a save location and writes chunks directly to disk. Other
  browsers reconstruct the file in memory and provide a download afterward.
- Transfers are not resumable. An interrupted or failed transfer must be sent
  again.
- Completed transfer metadata and language/theme preferences are stored in
  IndexedDB. File contents are not saved to IndexedDB.
- Offline caching covers the app shell; it does not provide peer connectivity.
  The service worker caches same-origin GET responses, never file contents sent
  over WebRTC.

## Browser limitations and validation

This is not a native Android application. A PWA cannot run an arbitrary HTTP
server on an Android port or access unrestricted device storage. File and
directory pickers, previews, camera access, background activity, notifications,
and file saving depend on browser support and permissions. WebRTC direct
connectivity is network-dependent, even when both devices use the same Wi-Fi.

The project has not been validated on physical Android/Windows device pairs;
browser compatibility, QR exchange, large-file integrity, and cross-network
behavior require real-device testing before production use.
