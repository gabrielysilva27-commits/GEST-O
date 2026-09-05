The production frontend was recovered from the public Worker URLs. The runtime was recovered from the Cloudflare script API and reconciled with those public assets. The API can return the latest uploaded script after a rollback; public assets were therefore fetched independently.

Build: `npm run build` uses `scripts/build-recovered.mjs`, the editable frontend under `assets/`, `index.html`, `recovered/runtime.js`, and `worker/dto-items.js`. Legacy `build-site.mjs` and `patch-dto-server.mjs` are no longer called.

Verification: `node scripts/test-dto.mjs`, `node --check dist/server/index.js`, and `npx wrangler deploy --dry-run`. Browser checks use `scripts/browser-check.mjs`, Playwright Edge, and TEST_USERNAME/TEST_PASSWORD environment variables. TEST_SITE selects read-only production verification; without it, testing uses a locally seeded Worker on port 8787.

Pushes to main build and test this same source before publishing through GitHub Actions. Cloudflare bindings and database data must be preserved. DTO edits are persisted as overlays; deletion uses recoverable tombstones. Ownership is checked using the authenticated username's server-side user ID, never a client-supplied role or creator name.
