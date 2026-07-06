'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

const EnterpriseNonceSchema = new Schema({
    apiKey: {
        type: String,
        required: true
    },
    nonce: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: { expires: '5m' } // 5 minutes TTL
    }
})

// Compound index to guarantee uniqueness of nonce per enterprise key
EnterpriseNonceSchema.index({ apiKey: 1, nonce: 1 }, { unique: true })

module.exports = mongoose.model('EnterpriseNonce', EnterpriseNonceSchema)
