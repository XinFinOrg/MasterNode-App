'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema
const crypto = require('crypto')
const config = require('config')

const ENCRYPTION_KEY = crypto.createHash('sha256').update(config.get('enterpriseMasterToken') || 'defaultSecretKey').digest() // 32 bytes
const IV_LENGTH = 16

function encrypt (text) {
    if (!text) return text
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
}

function decrypt (text) {
    if (!text) return text
    try {
        const textParts = text.split(':')
        if (textParts.length < 2) return text
        const iv = Buffer.from(textParts.shift(), 'hex')
        const encryptedText = Buffer.from(textParts.join(':'), 'hex')
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
    } catch (e) {
        return text
    }
}

const EnterpriseKeySchema = new Schema({
    apiKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    apiSecret: {
        type: String,
        required: true,
        select: false,
        get: decrypt,
        set: encrypt
    },
    enterpriseName: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
})

module.exports = mongoose.model('EnterpriseKey', EnterpriseKeySchema)
