'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

/**
 * Single-use nonces for /api/ipfs/addKYC. Each nonce is bound to one xdc
 * account, issued by /api/ipfs/requestKYCNonce, and consumed on successful
 * upload. The TTL index causes MongoDB to evict documents automatically
 * 5 minutes after creation, giving us a hard replay-window upper bound that
 * survives process restarts.
 */
// `unique: true` already creates the index, so the extra `index: true` on
// `nonce` is a duplicate-index warning at startup. `nonce` should also be
// required: a document missing this field would silently match the
// findOneAndUpdate({ nonce: undefined, ... }) probe and let any caller that
// omits the field consume "the empty nonce" (CodeRabbit #49).
const IpfsNonce = new Schema({
    nonce: { type: String, required: true, unique: true },
    account: { type: String, required: true, index: true },
    consumed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 300 }
}, {
    versionKey: false
})

module.exports = mongoose.model('IpfsNonce', IpfsNonce)
