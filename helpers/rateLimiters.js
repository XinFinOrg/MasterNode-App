'use strict'
/**
 * Centralized rate limiters for the MasterNode-App API surface.
 *
 * Addresses the M-2 finding from the 2026-04 security audit: no rate limiting
 * existed on any API endpoint. These limiters use `express-rate-limit` (in-memory
 * store). For multi-instance deployments behind a load balancer, swap the store
 * for `rate-limit-redis` once Redis is available.
 */

const rateLimit = require('express-rate-limit')

const WINDOW_1_MIN = 60 * 1000
const WINDOW_15_MIN = 15 * 60 * 1000
const WINDOW_1_HOUR = 60 * 60 * 1000

function buildLimiter (options) {
    return rateLimit(Object.assign({
        standardHeaders: true,
        legacyHeaders: false,
        // Keep the error body identical to the existing error middleware shape.
        handler: function (req, res) {
            return res.status(429).json({
                status: 429,
                error: { message: 'Too many requests, please retry later.' }
            })
        }
    }, options))
}

// Sensitive authentication / signature endpoints: generateLoginQR, verifyLogin,
// getLoginResult, generateMessage, verifyScannedQR. Stricter limits to curb
// QR-phishing mass-generation and brute force on signature verification.
const authLimiter = buildLimiter({
    windowMs: WINDOW_15_MIN,
    max: 60
    // Note: a custom `handler` in buildLimiter() already controls the 429
    // response shape, so a top-level `message` here would be silently
    // ignored (CodeRabbit #49). All limiters share the same response body.
})

// Transaction-broadcast endpoints that hit the blockchain RPC. These are
// expensive and should be tightly rate-limited per IP.
const txLimiter = buildLimiter({
    windowMs: WINDOW_15_MIN,
    max: 30
})

// Search / enumeration endpoints (potential DB DoS vector via $regex). Capped
// to a sensible user browsing rate.
const searchLimiter = buildLimiter({
    windowMs: WINDOW_1_MIN,
    max: 30
})

// KYC upload to IPFS: strict because the upload hits IPFS and is bounded to
// 10MB per request (see MAX_UPLOAD_BYTES in index.js).
const uploadLimiter = buildLimiter({
    windowMs: WINDOW_1_HOUR,
    max: 20
})

// Read-heavy public endpoints (candidates list, transaction history, voter
// dashboards). Generous but still capped to limit scraping abuse.
const readLimiter = buildLimiter({
    windowMs: WINDOW_1_MIN,
    max: 240
})

// Mutating masternode metadata (PUT /api/candidates/update). Signature-gated on
// the server side, but we still rate-limit to curb signature replay attempts.
const mutationLimiter = buildLimiter({
    windowMs: WINDOW_15_MIN,
    max: 20
})

module.exports = {
    authLimiter,
    txLimiter,
    searchLimiter,
    uploadLimiter,
    readLimiter,
    mutationLimiter
}
