---
'@cosmneo/onion-lasagna-hono': patch
---

Stream binary response bodies (`Uint8Array`, typed arrays, `ArrayBuffer`, `ReadableStream`) in `registerHonoRoutes` instead of JSON-serializing them. Handlers returning raw bytes (file downloads, image/binary proxies) with a non-JSON `Content-Type` are now written through `c.body()` unchanged, fixing corrupted binary responses.
