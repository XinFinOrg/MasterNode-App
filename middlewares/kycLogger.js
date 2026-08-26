'use strict'

const db = require('../models/mongodb')

async function kycLogger (req, res, next) {
    const originalJson = res.json
    const originalSend = res.send
    let responseSent = false

    const logEntry = new db.KycLog({
        endpoint: req.originalUrl,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        ip: req.ip
    })

    if (req.files) {
        logEntry.files = Object.keys(req.files).map(k => ({
            fieldname: k,
            name: req.files[k].name,
            size: req.files[k].size,
            mimetype: req.files[k].mimetype
        }))
    }

    const saveLog = (data, statusCode) => {
        if (!responseSent) {
            responseSent = true
            logEntry.responseStatus = statusCode || res.statusCode
            logEntry.responseData = data
            logEntry.success = logEntry.responseStatus >= 200 && logEntry.responseStatus < 300
            logEntry.save().catch(err => console.error('KycLog save error:', err))
        }
    }

    res.json = function (data) {
        saveLog(data, res.statusCode)
        return originalJson.call(this, data)
    }

    res.send = function (data) {
        saveLog(typeof data === 'string' ? data : data ? data.toString() : data, res.statusCode)
        return originalSend.call(this, data)
    }

    next()
}

module.exports = kycLogger
