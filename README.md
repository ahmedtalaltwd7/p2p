# LocalDrop

LocalDrop is a browser-based, peer-to-peer file transfer prototype. Its
interface, WebRTC connection layer, chunked transfer protocol, local transfer
history, and PWA app shell are implemented with browser APIs and vanilla
JavaScript.

```sh
npm install
npm run dev
```

Create a production build with `npm run build`; preview it with `npm run
preview`. The app must be served from a secure context (HTTPS, or localhost)
for APIs such as service workers and the File System Access API. On a phone,
use an HTTPS deployment or a local trusted development setup.

## Connecting devices

1. Open LocalDrop on both devices at the same time.
2. On one device, choose **Create connection** and **Create offer**.
3. Copy the full offer JSON to the other device using a private, direct method.
4. On the other device, paste the offer and choose **Create answer**.
5. Copy the answer JSON back to the first device and choose **Finish connection**.

The exchange contains complete SDP, including gathered ICE candidates; no
signaling server, STUN server, or TURN server is configured. Network policy,
NAT, browser candidate privacy, and Wi-Fi client isolation may prevent a direct
connection. This build has no QR generation or scanning; connection codes
should not be sent through public services.

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
