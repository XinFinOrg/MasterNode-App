'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

// `unique: true` already creates the underlying B-tree index; keeping
// `index: true` next to it produces a duplicate-index warning on startup
// in mongoose@5+ (CodeRabbit #49). Same applies below for signedId.
const Signature = new Schema({
    signedAddress: { type: String, unique: true },
    // unique+sparse keeps the lateral-takeover fix atomic: once any wallet has
    // bound itself to a signedId the underlying unique-index error fires for
    // every other concurrent wallet trying to claim the same QR session.
    signedId: { type: String, unique: true, sparse: true },
    message: String,
    signature: String,
    status: Boolean,
    expiredAt: { type: Date, expires: 86400, default: Date.now }
}, {
    timestamps: true,
    versionKey: false
})

module.exports = mongoose.model('Signature', Signature)
