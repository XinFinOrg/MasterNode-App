'use strict'
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const db = {}
const config = require('config')
const logger = require('../../helpers/logger')

// Prefer an env-var connection string (supports credentials & replica sets)
// so the deployer never has to commit a MongoDB username/password to config
// files. Falls back to config('db.uri') for backwards compatibility.
const mongoUri = process.env.MONGO_URI || process.env.DB_URI || config.get('db.uri')

// Emit only the host portion of the URI so credentials embedded in the URI
// never hit stdout.
function maskedUri (uri) {
    try { return String(uri).replace(/\/\/([^@]+)@/, '//***@') } catch (e) { return 'mongodb://***' }
}
logger.info('Connecting to MongoDB at %s', maskedUri(mongoUri))

mongoose.Promise = global.Promise
mongoose.set('strictQuery', true)

// mongoose@5+ deprecated the (uri, opts, cb) signature; stale callbacks no
// longer fire reliably and the process kept running on a bad URI without ever
// surfacing the error (CodeRabbit #49). Use the Promise form so the failure
// is logged and the container exits with a non-zero status, letting the
// orchestrator restart it with the correct config.
mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000
}).catch((err) => {
    logger.error('MongoDB connection error: %s', err.message || err)
    process.exit(1)
})

// Surface post-connect errors (replica set steps down, network blips, etc.)
// so they don't get swallowed.
mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection event error: %s', err.message || err)
})

// import all file in this dir, except index.js
fs.readdirSync(__dirname)
    .filter(function (file) {
        return (file.indexOf('.') !== 0) && (file !== 'index.js')
    })
    .forEach(function (file) {
        var model = require(path.join(__dirname, file))
        db[model.modelName] = model
    })

db.mongoose = mongoose
module.exports = db
