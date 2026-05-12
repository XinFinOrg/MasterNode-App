'use strict'
const logger = require('../helpers/logger')

// Matches the fail-secure check used in index.js: treat every non-dev env as
// production so error messages stay sanitized under NODE_ENV=mainnet/testnet
// as well as the unset case.
const IS_PRODUCTION = !['development', 'dev', 'test', 'local'].includes(String(process.env.NODE_ENV || '').toLowerCase())

function safeExtractValidatorMessage (err) {
    // Handle express-validator error arrays: [{param, msg, ...}, ...]
    if (Array.isArray(err) && err.length > 0 && err[0] && typeof err[0].msg === 'string') {
        return err[0].msg
    }
    return null
}

module.exports = function (err, req, res, next) {
    if (!err) return next()
    if (err === true) err = {}

    const status = parseInt(err.status, 10) || 406
    let message = (typeof err.message === 'string' && err.message)
        ? err.message
        : safeExtractValidatorMessage(err) || 'Not Acceptable'

    // Log at full fidelity, but never send raw stack/paths back to the client.
    if (status !== 401 && status !== 403) {
        logger.warn('request %s %s failed: %s', req.method, req.originalUrl, message)
    }

    return res.status(status).json({
        status,
        error: {
            message: IS_PRODUCTION ? sanitizeForClient(message) : message
        }
    })
}

// Strip filesystem paths and stack frames from client-facing error messages,
// then run an allowlist over the result. The previous regex-only approach
// missed several stack-frame shapes (native frames, "at module.func ...",
// Windows backslash paths, anonymous closures) — anything we didn't
// explicitly recognise was forwarded verbatim (CodeRabbit #49). Now any
// production message that contains characters outside the allowlist is
// replaced wholesale with the generic "Error".
//
// Allowlist: alphanumerics, whitespace, basic punctuation, and the
// separators we actually use in validator messages (`|`, `=`, `+`).
// Specifically excludes `/` (path separator), `\`, shell metacharacters,
// angle brackets, braces, quotes and backticks so a leaked stack frame,
// JSON dump, file path or HTML payload can't slip through.
const SAFE_MESSAGE_RE = /^[A-Za-z0-9 ,.'!?:;()\-_|=+]{1,200}$/
function sanitizeForClient (msg) {
    if (typeof msg !== 'string') return 'Error'
    const stripped = msg
        // Windows-style absolute paths
        .replace(/[A-Za-z]:\\[^\s'"`]+/g, '')
        // Unix-style multi-segment paths (anything that looks like /a/b...)
        .replace(/(?:\/[^\s'"`/]+){2,}/g, '')
        // Common stack-frame shapes ("at func (path:line:col)")
        .replace(/\s+at\s+[^\s]+(\s+\([^)]*\))?/g, '')
        // Trailing or stray "at" left dangling after a path strip
        .replace(/(^|\s)at(\s+|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    if (!stripped) return 'Error'
    return SAFE_MESSAGE_RE.test(stripped) ? stripped : 'Error'
}
