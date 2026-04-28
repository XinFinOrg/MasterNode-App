'use strict'

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
// body parse
const app = express()

// helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['\'self\''],
            scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\'', 'https://www.google-analytics.com', 'https://www.googletagmanager.com'],
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            imgSrc: ['\'self\'', 'data:', 'https:', 'http:', 'https://www.google-analytics.com'],
            connectSrc: ['\'self\'', 'https:', 'wss:', 'http:', 'ws:', 'https://www.google-analytics.com'],
            fontSrc: ['\'self\'', 'data:', 'https:'],
            objectSrc: ['\'none\''],
            baseUri: ['\'self\''],
            frameAncestors: ['\'none\''],
            formAction: ['\'self\'']
        }
    },
    frameguard: {
        action: 'deny'
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true
}))

// cors
// app.use(cors({
//     origin: config.get('cors')
// }))

app.use((req, res, next) => {
    console.log('--- INCOMING REQUEST ---')
    console.log('Method:', req.method)
    console.log('URL:', req.originalUrl)
    console.log('Origin:', req.headers.origin || 'NO ORIGIN')
    console.log('Referer:', req.headers.referer || 'NO REFERER')
    console.log('IP:', req.ip || req.socket.remoteAddress)

    res.on('finish', () => {
        console.log('Response Status:', res.statusCode)
        console.log('--- REQUEST END ---')
    })

    next()
})

app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = config.get('cors')

        console.log('--- CORS CHECK ---')
        console.log('Origin:', origin || 'NO ORIGIN')

        if (!origin) {
            console.log('✅ No origin → allowing (server request)')
            return callback(null, true)
        }

        if (allowedOrigins.includes(origin)) {
            console.log('✅ Allowed origin:', origin)
            return callback(null, true)
        }

        console.log('❌ Blocked by CORS:', origin)
        return callback(new Error('Not allowed by CORS'))
    }
}))

app.use((err, req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
        console.log('🚫 CORS ERROR')
        console.log('Method:', req.method)
        console.log('URL:', req.originalUrl)
        console.log('Origin:', req.headers.origin || 'NO ORIGIN')

        return res.status(403).json({
            message: 'Blocked by CORS',
            method: req.method,
            url: req.originalUrl,
            origin: req.headers.origin || null
        })
    }

    next(err)
})

app.use(morgan('short', { stream: logger.stream }))

const server = require('http').Server(app)
app.use(flash())
app.use(fileUpload())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(validator({}))

app.use('/build', express.static('build'))
app.use('/app/assets', express.static('app/assets'))
const docs = yaml.safeLoad(fs.readFileSync('./docs/swagger.yml', 'utf8'))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(docs))

// apis
app.use(require('./apis'))
app.use(require('./middlewares/sitemap'))

// error handler
app.use(require('./middlewares/error'))

app.get('*', function (req, res) {
    let p
    if (process.env.NODE_ENV === 'development') {
        p = path.resolve(__dirname, 'index.html')
    } else {
        p = path.resolve(__dirname, './build', 'index.html')
    }
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
