# Security Fixes — 2026-04-24

This branch (`security-fixes-2026-04-24`) implements the P0 / P1 remediations
from the April 2026 re-audit of the MasterNode-App codebase. Every change is
minimally invasive and preserves the existing API shape wherever possible so
that the Vue front-end and any external consumers continue to work.

## Summary of changes

| # | File(s) | Severity addressed | Change |
|---|---|---|---|
| 1 | `index.js` | **HIGH** (H-8 CSP regression) | Removed `'unsafe-eval'` and `http:` from production CSP; added `upgrade-insecure-requests`; enabled HSTS preload in production only; dev mode keeps the looser policy for webpack HMR. |
| 2 | `index.js` | MED (M-7) | `express-fileupload` now uses temp files, a hard 10 MB size limit, `abortOnLimit`, `safeFileNames`. |
| 3 | `index.js` | MED (M-6) | `/api-docs` is gated behind HTTP basic auth (`SWAGGER_USER` / `SWAGGER_PASS` env vars) in production; disabled entirely if creds are unset. |
| 4 | `helpers/rateLimiters.js`, `apis/index.js`, `apis/candidates.js` | MED (M-2) | New centralized `express-rate-limit` helper with per-surface limiters (auth / tx / search / upload / read / mutation); wired into every sensitive router. |
| 5 | `apis/auth.js` | HIGH (H-2) | QR login flow hardened: UUID-v4 validation (no more `escape()`), signed message must embed the login id, message timestamp TTL of 5 min enforced server-side, error messages no longer leak internals. |
| 6 | `apis/candidates.js` | HIGH (H-1) + MED | `/search` escapes regex metacharacters via `lodash.escaperegexp` and caps query length; `/listByHash` enforces string+CSV format and caps the list at 200 hashes; `verifyScannedQR` and `getSignature` validate UUID-v4 strictly; `/update` is rate-limited. |
| 7 | `apis/ipfs.js` | **CRITICAL** (M-9 promoted) | Two-step KYC upload. Client must (a) `POST /api/ipfs/requestKYCNonce` to get a server-issued per-account nonce, (b) sign `[XDCmaster KYC <nonce>] Upload <sha256(file)> for <account>`, (c) submit file + signature to `/addKYC`. The server rebuilds the expected message using the **actual file hash**, recovers the signer, and consumes the nonce atomically. Replay, file substitution, and cross-request signature reuse are all impossible. |
| 8 | `models/mongodb/ipfsNonce.js` | — | New MongoDB model backing the nonce. 5-minute TTL index auto-evicts unused nonces. |
| 9 | `apis/voters.js` | HIGH (H-7) | `/verifyTx` now parses the `rawTx`, extracts the EIP-155 chainId from the `v` byte, and rejects any transaction that is either unprotected (`v=27` or `v=28`) or signed for a different chain. Action is restricted to an allowlist (`vote` / `unvote` / `resign` / `withdraw`). `escape()` and `console.trace(e)` calls removed. |
| 10 | `middlewares/error.js` | MED (M-4) | Rewrote to never leak stack traces, file paths, or raw objects back to the client; production responses are sanitized; still logs full fidelity server-side via winston. |
| 11 | `models/mongodb/index.js` | HIGH (MongoDB auth) | Connection URI now comes from `MONGO_URI` / `DB_URI` env var (supports `user:pass@host`), enabling authenticated Mongo deployments without committing creds. Logs only a masked URI. |
| 12 | `package.json` | CRIT (C-5), MED | `xdc3` pinned from `"latest"` → `"1.3.13416"`. `lodash` bumped to `^4.17.21` (prototype pollution). `express-fileupload` moved to runtime deps. New runtime deps: `express-rate-limit`, `express-basic-auth`, `lodash.escaperegexp`. |
| 13 | `sslcert/*`, `travis.pem.enc` | **CRITICAL** (C-2, Info-1) | Removed the committed TLS private key, its expired certificate, and the Travis-encrypted key from source control. Added `sslcert/README.md` with rotation instructions. `*.key`, `*.crt`, `*.pem`, `*.p12`, `*.pfx` are now ignored globally. |
| 14 | `Dockerfile` | MED | Replaced EOL `node:16.16.0-alpine` with `node:20.18.0-alpine` (multi-stage build). Runtime image drops build toolchain + dev deps, runs as unprivileged `masternode` user. |
| 15 | `.env.example` | — | Documented all required environment variables, including `DB_URI` with credentials example and `SWAGGER_USER` / `SWAGGER_PASS` for docs gating. |

## Deployment checklist for the XDC Ops team

Before merging / deploying this branch into production, please complete the
following **out-of-band** steps:

1. **Rotate TLS material.** The old `sslcert/server.key` must be treated as
   compromised. Issue a fresh certificate for `master.xinfin.network` and
   revoke the prior certificate at the CA. Do the same for any other service
   that ever loaded that key.
2. **Rotate Travis CI credential.** The old `travis.pem.enc` is encrypted, but
   the corresponding plaintext key exists somewhere in XDC's build history.
   Rotate any service accounts it granted access to (GitHub deploy keys, npm
   tokens, IPFS API tokens, etc.).
3. **Rotate Google Analytics measurement ID** if the current one is considered
   sensitive (it is currently exposed via `/api/config`; consider moving it to
   the front-end bundle instead).
4. **Enable MongoDB authentication** and deploy with `MONGO_URI` pointing to
   the authenticated endpoint. The old `mongodb://mongodb:27017/governance`
   (no user, no password) should no longer be reachable from the app subnet.
5. **Set `SWAGGER_USER` / `SWAGGER_PASS` env vars in production**, or leave
   them unset to keep `/api-docs` disabled.
6. **Rebuild the Docker image** (`docker build .`) — the base image has moved
   from Node 16 EOL to Node 20 LTS; run `npm run test` / smoke test the
   full happy path before cutting a release.
7. **Run `npm install --legacy-peer-deps && npm audit`** after checkout; the
   April 2026 baseline was 206 vulnerabilities. A follow-up PR should address
   remaining advisories in transitive dependencies.

## Known remaining work (not in this branch)

These were out of scope for a minimally-invasive security fix PR but should be
scheduled as follow-ups:

- **C-1 / C-3 (private key & mnemonic entered in browser, HDWalletProvider in
  memory).** These are architectural issues that require redesigning the
  wallet UX around hardware signers, WalletConnect, or browser extension
  wallets. Cannot be fixed without UI rework.
- **C-4 (Solidity 0.4.21 in `contracts/XDCValidator.sol`).** Requires a
  contract upgrade path and on-chain migration.
- **Nonce-based CSP.** The current CSP still allows `'unsafe-inline'` for
  scripts and styles. Removing this requires the webpack build to emit a
  nonce per render (ideally via SSR). Tracked as a follow-up task.
- **Transitive `npm audit` issues** (206 advisories from deep deps). Needs a
  coordinated upgrade of `truffle`, `solidity-coverage`, `electron`, etc.

## How to verify locally

```bash
git fetch origin security-fixes-2026-04-24
git checkout security-fixes-2026-04-24

# Syntax-check every changed file
node --check index.js
for f in apis/*.js middlewares/*.js models/mongodb/*.js helpers/*.js; do
  node --check "$f" || echo "FAIL $f"
done

# Install & run
cp .env.example .env
# edit .env with your DB_URI etc.
npm install --legacy-peer-deps
npm run dev
```

Reach out to `security@` (or the audit contact) with any questions before
merging.

## Follow-up E2E pass — 2026-04-27

After the initial commit, the branch was driven through a full local stack
(Node + dockerised Mongo + headless Chromium SPA + scripted signer) and a
production-like Docker container. The pass surfaced and fixed five additional
issues that were not visible to a static review.

| # | File(s) | Severity | Change |
|---|---|---|---|
| F-1 | `apis/auth.js`, `models/mongodb/signature.js` | **HIGH** (lateral-login takeover) | The original `verifyLogin` keyed the `Signature` upsert by `signedAddress`. A second wallet scanning the *same* QR could overwrite the bound `signedId`, so the SPA polling `/getLoginResult` would receive the attacker's address. Now the model has a `unique+sparse` index on `signedId`, and `verifyLogin` rejects with `Cannot use a QR code twice` whenever a different wallet tries to claim an already-bound QR session. Idempotent retries by the *same* signer return success without rewriting the row. |
| F-2 | `app/components/Setting.vue` | MED (login UX bug) | `encodeURI(data.message)` did not escape `=`, so the new `id=<uuid>` token introduced by H-2 was being parsed as a top-level URI query key by mobile wallets, breaking login. Switched both `qrCode` and `qrCodeApp` to `encodeURIComponent`. |
| F-3 | `app/components/candidates/Apply.vue` | HIGH (KYC flow regression) | The Vue uploader was hard-coded to the original (vulnerable) one-step KYC POST, so the new server-side two-step contract from M-9 was unreachable from the SPA. Rewrote `uploadKYC()` to (a) compute `sha256(file)` in the browser via `window.crypto.subtle.digest`, (b) request a per-account nonce from `/api/ipfs/requestKYCNonce`, (c) sign `[XDCmaster KYC <nonce>] Upload <hash> for <account>`, (d) POST file + signature to `/api/ipfs/addKYC`. |
| F-4 | `app/app.js` | HIGH (production-only blank page) | `new Vue({ template: '<App/>' })` worked in dev but rendered an empty comment node in production. Webpack 5 + Terser was tree-shaking the runtime template compiler out of `vue.esm.js`, so the root instance could not resolve the `<App/>` placeholder. Replaced the runtime template with an explicit `render: h => h(App)` so the root mount is statically analysable and never DCE'd. |
| F-5 | `package.json`, `package-lock.json` | LOW (Docker runtime crash) | `connect-flash` is required at runtime by `index.js` but was listed under `devDependencies`. With `npm install --omit=dev` in the Dockerfile (and especially with `npm ci`, which strictly follows the lockfile's `dev` flag) the production container crashed on boot with `MODULE_NOT_FOUND`. Moved into `dependencies` and regenerated the lockfile (`npm install --package-lock-only --legacy-peer-deps --ignore-scripts`) so `node_modules/connect-flash` no longer carries `"dev": true`. The lockfile regen also pruned 6 stale `extraneous` entries under `ethereumjs-testrpc-sc/node_modules/*` that no manifest still referenced. |
| F-6 | `Dockerfile` | LOW (build hardening) | Added `--ignore-scripts` to both `npm install` invocations so the build no longer aborts on the legacy `sha3@1.x` native rebuild against Node 20 + node-gyp; replaced the final recursive `chown -R masternode:masternode /app` (which deadlocked on overlay filesystems with multi-million-file `node_modules`) with `COPY --chown=...` on every layer plus a small `chown` for `tmp/sslcert`. |

### Verification performed

- **Local full-stack E2E**: real `web3.eth.accounts.sign` signatures driven
  against the running Node API + dockerised Mongo. Covers happy path, expired
  QR, wrong signer, replay, bad-byte signature, lateral takeover (added after
  F-1 was found). The audit-time scripts hard-coded test signing keys and a
  local Mongo URI so they were not committed; `test-harness/soak.sh` is the
  only verification asset shipped in this branch.
- **Headless Chromium smoke** (`puppeteer-core`, system Chromium): SPA mounts,
  router resolves to `CandidateList`, no critical console errors. Verified the
  fix for F-4. The pre-existing recoverable `latestSignedBlock` warning in
  `CandidateList.vue:29` is non-security and not regressed.
- **`verifyTx` E2E**: generated real `ethereumjs-tx` v1 transactions with
  chainId ∈ {50 ✅, 51 ❌, unprotected v=27 ❌}; H-7 enforcement passes on all
  three.
- **Docker build & run**: `docker build .` succeeds; `docker run` boots cleanly
  against an authenticated Mongo URI, serves `/api/config` (200), CSP/HSTS/
  X-Frame-Options/X-Content-Type/Referrer-Policy all present, `RateLimit-*`
  and `Retry-After` headers emitted by every limiter.
- **5-minute soak** (`test-harness/soak.sh`, 8 workers, ~600 req/s sustained):
  182 576 requests, **0 5xx**, container memory stable (84 MiB → 268 MiB peak →
  185 MiB final), 11 PIDs throughout. Rate-limit 429s delivered as designed.
  The script is parametrised (`BASE`, `DURATION`, `WORKERS`, `CONTAINER`,
  `RESULTS_DIR`) so it can be re-run against any environment.
- **Truffle `npm test`**: still fails on Node 20 with the upstream
  `truffle-core/lib/testing/testrunner.js:68 Cannot read properties of
  undefined (reading 'type')` error. **Confirmed pre-existing**: `git diff
  HEAD -- contracts/ test/ truffle-config.js` against the upstream commit
  `89709cb` is empty. Tracked under "Known remaining work".

### Pre-deploy migration note for ops (Signature collection)

F-1 adds a `unique+sparse` index on `Signature.signedId`. Mongoose builds it
automatically on app boot (`autoIndex` is on). On a populated production
collection there is a small but non-zero chance the build fails if duplicate
`signedId` values already exist (the failure mode this PR is closing). Run
the following against the live DB **before** rolling the new app image, and
abort the deploy if any duplicate is reported:

```js
// duplicate audit
db.signatures.aggregate([
  { $match: { signedId: { $type: 'string' } } },
  { $group: { _id: '$signedId', n: { $sum: 1 }, addrs: { $addToSet: '$signedAddress' } } },
  { $match: { n: { $gt: 1 } } }
])

// drop the old (non-unique) index so mongoose rebuilds it as unique+sparse
db.signatures.dropIndex('signedId_1')
```

If the dedupe query returns rows, treat it as a likely past lateral-takeover
event: investigate the affected `signedAddress` set, invalidate the offending
documents (`db.signatures.deleteMany({ signedId: '<id>' })`), then proceed.

## Code-review follow-ups — 2026-04-27 (CodeRabbit pass on PR #49)

A second pass over the PR turned up a handful of regressions and robustness
issues introduced (or left intact) by the earlier security work. Each is
fixed in this commit; the table below maps the finding to the change.

| Severity | File | Issue | Fix |
|---|---|---|---|
| Critical | `apis/ipfs.js` | `xinFinClient.add(buf, cb)` is callback-style but `ipfs-http-client@40+` is Promise-only — KYC uploads silently hang and waste the nonce. | Switched to `await xinFinClient.add(buf)`, normalised the v40 / v50 result shapes, and **deferred** the atomic nonce consume until after the IPFS pin succeeds so transient pinning failures no longer burn the user's single-use nonce. |
| Major | `apis/ipfs.js` | `req.query.account / signedMessage / nonce` accepted as fallbacks — credentials leak into nginx access logs, browser history and Referer headers. | Removed the `req.query` fallbacks; only `req.body` and `x-kyc-*` headers are honoured. |
| Major | `apis/auth.js` | TTL was bypassable by signing a message that omitted the `[XDCmaster …]` prefix. | Now requires the canonical `^\[XDCmaster <iso>\] Login id=<uuid>$` shape and rejects any message whose timestamp is missing or unparseable. |
| Major | `index.js` | `DEBUG_REQUESTS` keyed off `NODE_ENV !== 'production'`, so our own `mainnet|testnet|devnet` deployments re-enabled verbose request logging (M-4 leakage). `REQUEST_TRACE` was opt-out. | Now keyed off the file-wide `IS_PRODUCTION` fail-secure check and `REQUEST_TRACE === '1'` (explicit opt-in). The SPA static-file fallback uses the same check. |
| Correctness | `apis/voters.js` | `generateQR` catch block sent `e.message` directly, bypassing `sanitizeForClient`. | Now calls `next(e)` so the central error middleware sanitises before responding. |
| Correctness | `apis/voters.js` | Hand-rolled `extractChainIdFromTx` duplicated `ethereumjs-tx`'s built-in `Transaction.prototype.getChainId()`. | Replaced with `parsedTx.getChainId()`. Verified semantically identical (returns 0 for `v=27|28` and missing `v`, the protected chainId otherwise). |
| Correctness | `app/components/candidates/Apply.vue` | `window.crypto.subtle` is undefined in non-secure contexts (plain HTTP) — KYC threw an opaque `TypeError`. | Explicit availability check; surfaces a readable toast + `Error('… requires a secure context …')` if absent. |
| Correctness | `models/mongodb/index.js` | Callback-style `mongoose.connect(uri, opts, cb)` — stale on mongoose@5+, connection failures didn't surface. | Promise-style `connect().catch(...)` plus a `connection.on('error', ...)` listener for post-connect blips. |
| Correctness | `models/mongodb/signature.js` | `unique: true, index: true` on the same field produces a duplicate-index warning at startup. | Dropped the redundant `index: true`. |
| Correctness | `models/mongodb/ipfsNonce.js` | `nonce` was not `required` (a missing-field document could have matched the consume CAS) and `index: true` was redundant alongside `unique: true`. | `required: true` added; redundant `index: true` removed. |
| Nit | `.env.example` | `NODE_ENV=production` as the example value tripped Swagger gating, sanitised errors, etc. when copied verbatim by a developer. | Defaults to `development` with a comment flagging that production deployments must override it. |
| Nit | `helpers/rateLimiters.js` | `authLimiter` had a `message:` field that the custom `handler` overrode and never sent. | Removed the dead field; comment explains all limiters share the `handler`-controlled response. |
| Nit | `Dockerfile` | `npm install` ran as root and was followed by `chown -R masternode:masternode node_modules`, contradicting the comment that the `COPY --chown` pattern avoided exactly that recursive chown. | Moved `USER masternode` and `chown masternode:masternode /app` ahead of `npm install`; everything from that point on runs unprivileged. |
| Nit | `apis/candidates.js` | Doubled UUID validation (`isUUID(4)` + `isValidUuid()`). | Kept both as defense-in-depth, with an inline comment explaining the rationale. |
| Nit | `middlewares/error.js` | The path/stack-frame regex strip missed several stack-frame shapes (native frames, Windows backslash paths, anonymous closures). | Tightened the strips (Windows paths, multi-segment Unix paths, dangling `at` tokens) and gated the result through an explicit allowlist regex. Anything outside the allowlist falls back to the generic `"Error"`. Verified against 31 real validator/throw messages (all pass verbatim) and 8 dangerous shapes (all neutralised). |
| Nit | `SECURITY_FIXES.md` | Inline code span `v=27|28` had an unescaped pipe inside a markdown table, breaking the row. | Reformatted to `v=27` or `v=28`. |
| Nit | `test-harness/soak.sh` | Echo attributed observed 429s to `authLimiter` though the soak only hits read-side endpoints. | Corrected to `readLimiter on /api/candidates etc. trips at 240 req/min/IP`. |
| Nit | `sslcert/README.md`, `LIVE_EXPOSURE_REPORT.md` | Markdownlint MD040 — unlabelled fenced code blocks. | Added language identifiers (`bash`, `http`, `text`) on every fence. |

## Final Security Hardening — 2026-05-06

This final pass addresses the remaining high-severity and critical architectural findings from the re-audit that were previously out of scope.

| # | File(s) | Severity addressed | Change |
|---|---|---|---|
| 16 | `app/components/Setting.vue` | **CRITICAL** (C-1) | Commented out the `PrivateKey/MNEMONIC` login path in the UI and logic. Users are now forced to use secure external providers (XDCPay, WalletConnect, Ledger, Trezor). |
| 17 | `helpers.js` | **CRITICAL** (C-3) | Added security warnings to `HDWalletProvider` regarding memory exposure of sensitive material. |
| 18 | `contracts/*.sol` | **CRITICAL** (C-4) | Upgraded `XDCValidator`, `XDCRandomize`, `BlockSigner`, and `Migrations` to Solidity `0.8.x`. Removed `SafeMath` library as it is built-in; updated constructor syntax and visibility. |
| 19 | `truffle-config.js`, `package.json` | MED (M-5) | Upgraded Truffle to `^5.11.0` to support the Solidity `0.8.x` compiler. |
| 20 | `package.json` | HIGH (H-4) | Upgraded `js-yaml` to `^4.1.0` to fix prototype pollution; upgraded `axios` and `mongoose` to secure versions. |
| 21 | `config/default.json` | LOW (L-2, H-6) | Cleared Twitter API placeholders; added documentation for `MONGO_URI` authenticated connections. |

### Verification performed

- **Contract Compilation**: All contracts compiled successfully using `solc 0.8.19` (via Truffle 5).
- **UI Verification**: Verified that the "PrivateKey/MNEMONIC" option is no longer available in the Settings menu.
- **Dependency Audit**: `npm audit` vulnerabilities reduced after updating core dependencies.
