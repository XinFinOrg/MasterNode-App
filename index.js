'use strict'

require('dotenv').config()
const express = require('express')
const config = require('config')
const bodyParser = require('body-parser')
const validator = require('express-validator')
const path = require('path')
const yaml = require('js-yaml')
const fs = require('fs')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const morgan = require('morgan')
const logger = require('./helpers/logger')
const helmet = require('helmet')
const flash = require('connect-flash')
const fileUpload = require('express-fileupload')
const basicAuth = require('express-basic-auth')
// body parse
const app = express()

// When the app runs behind a reverse proxy (Fly.io, Nginx, CloudFlare), req.ip
// resolves to the proxy's IP unless we tell Express which upstream hops to
// trust. Without this, express-rate-limit buckets every real client into a
// single key (the proxy IP) — one abuser DoSs everyone. Configure via
// TRUST_PROXY env: a positive integer (hop count), a CIDR, 'loopback', or
// 'true'/'false'. Default: 1 hop (matches Fly.io / Heroku defaults).
const trustProxyEnv = process.env.TRUST_PROXY
if (trustProxyEnv === 'true' || trustProxyEnv === 'false') {
    app.set('trust proxy', trustProxyEnv === 'true')
} else if (trustProxyEnv && !isNaN(Number(trustProxyEnv))) {
    app.set('trust proxy', Number(trustProxyEnv))
} else if (trustProxyEnv) {
    app.set('trust proxy', trustProxyEnv)
} else {
    app.set('trust proxy', 1)
}

// Fail-secure: every env name that isn't explicitly a local dev / test
// environment activates the hardened security headers. This covers the
// XDC team's `NODE_ENV=mainnet|testnet|devnet` deployment style as well as
// the conventional `NODE_ENV=production`, and defaults to strict mode when
// NODE_ENV is unset.
const IS_PRODUCTION = !['development', 'dev', 'test', 'local'].includes(String(process.env.NODE_ENV || '').toLowerCase())

// helmet / CSP
// Production builds emit only external <script src=...> tags in build/index.html,
// so we can enforce a strict script-src without 'unsafe-inline'. Dev keeps
// 'unsafe-eval' only for webpack HMR; production does not.
const cspScriptSrc = ["'self'", 'https://www.google-analytics.com', 'https://www.googletagmanager.com']
const cspConnectSrc = ["'self'", 'https:', 'wss:', 'https://www.google-analytics.com']
const cspImgSrc = ["'self'", 'data:', 'https:', 'https://www.google-analytics.com']
if (!IS_PRODUCTION) {
    // webpack-dev-server HMR needs eval + ws: in dev only
    cspScriptSrc.push("'unsafe-eval'")
    cspConnectSrc.push('ws:', 'http:')
    cspImgSrc.push('http:')
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: cspScriptSrc,
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: cspImgSrc,
            connectSrc: cspConnectSrc,
            fontSrc: ["'self'", 'data:', 'https:', 'https://fonts.gstatic.com'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
            // helmet v3 expects `true` (or omit the key) to emit this directive.
            ...(IS_PRODUCTION ? { upgradeInsecureRequests: true } : {})
        }
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true,
    hsts: IS_PRODUCTION ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
}))

// CORS with explicit allowlist (request origins not in config.cors are rejected).
// The verbose request logging from the upstream commit is gated behind the
// same fail-secure IS_PRODUCTION check we use everywhere else in this file.
// Going off `process.env.NODE_ENV !== 'production'` (CodeRabbit #49) treated
// our own deployments — which run with NODE_ENV=mainnet|testnet|devnet — as
// non-production and re-introduced the M-4 leakage. REQUEST_TRACE is an
// explicit opt-in: only "1" enables it, everything else disables it.
const DEBUG_REQUESTS = !IS_PRODUCTION && process.env.REQUEST_TRACE === '1'

if (DEBUG_REQUESTS) {
    app.use((req, res, next) => {
        logger.debug('req %s %s origin=%s ip=%s', req.method, req.originalUrl,
            req.headers.origin || '-', req.ip || req.socket.remoteAddress || '-')
        res.on('finish', () => {
            logger.debug('res %s %s status=%d', req.method, req.originalUrl, res.statusCode)
        })
        next()
    })
}

app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = config.get('cors')
        if (!origin) {
            // Server-to-server / same-origin / curl requests have no Origin
            // header; allow them through since CORS only protects browsers.
            return callback(null, true)
        }
        if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        logger.warn('CORS blocked origin=%s method=%s url=%s', origin, 'n/a', 'n/a')
        return callback(new Error('Not allowed by CORS'))
    }
}))

app.use((err, req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
        logger.warn('CORS denied %s %s origin=%s', req.method, req.originalUrl, req.headers.origin || '-')
        return res.status(403).json({ message: 'Blocked by CORS' })
    }
    next(err)
})

app.use(morgan('short', { stream: logger.stream }))

const server = require('http').Server(app)
app.use(flash())

// express-fileupload hardening: write to tmp dir and enforce a hard 10MB limit.
// abortOnLimit ensures we don't buffer unbounded request bodies in RAM (M-7).
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'tmp'),
    createParentPath: true,
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    abortOnLimit: true,
    safeFileNames: true,
    preserveExtension: 4
}))

app.use(bodyParser.urlencoded({ extended: true, limit: '200kb' }))
app.use(bodyParser.json({ limit: '200kb' }))
app.use(validator({}))

app.use('/build', express.static('build'))
app.use('/app/assets', express.static('app/assets'))

// Swagger UI is a reconnaissance vector (M-6). In production, require basic auth
// with credentials supplied via SWAGGER_USER / SWAGGER_PASS env vars; if unset,
// disable the endpoint entirely.
if (IS_PRODUCTION) {
    const swaggerUser = process.env.SWAGGER_USER
    const swaggerPass = process.env.SWAGGER_PASS
    if (swaggerUser && swaggerPass) {
        const docs = yaml.load(fs.readFileSync('./docs/swagger.yml', 'utf8'))
        app.use(
            '/api-docs',
            basicAuth({ users: { [swaggerUser]: swaggerPass }, challenge: true, realm: 'XDCmaster-docs' }),
            swaggerUi.serve,
            swaggerUi.setup(docs)
        )
    }
} else {
    const docs = yaml.load(fs.readFileSync('./docs/swagger.yml', 'utf8'))
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(docs))
}

// apis
app.use(require('./apis'))
app.use(require('./middlewares/sitemap'))

// error handler
app.use(require('./middlewares/error'))

app.get('*', function (req, res) {
    // Use the same fail-secure check as the rest of the file — anything
    // that isn't a recognised dev/local NODE_ENV serves the production
    // bundle from build/.
    const p = !IS_PRODUCTION
        ? path.resolve(__dirname, 'index.html')
        : path.resolve(__dirname, './build', 'index.html')
    return res.sendFile(p)
})

// error handler
app.use(require('./middlewares/error'))

// start server
server.listen(config.get('server.port'), config.get('server.host'), function () {
    const host = server.address().address
    const port = server.address().port
    console.info('Server start at http://%s:%s', host, port)
})

module.exports = app
