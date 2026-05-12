'use strict'
const express = require('express')
const config = require('config')
const router = express.Router()
const utils = require('ethereumjs-util')
const db = require('../models/mongodb')
const logger = require('../helpers/logger')

const uuidv4 = require('uuid/v4')
const urljoin = require('url-join')
const { check, validationResult, query } = require('express-validator/check')

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
// Login signatures older than this are rejected at verify time to curb QR-phishing
// replay windows.
const LOGIN_SIGNATURE_TTL_MS = 5 * 60 * 1000

function isValidUuid (id) {
    return typeof id === 'string' && UUID_V4_REGEX.test(id)
}

router.get('/generateLoginQR', async (req, res, next) => {
    try {
        // Embed the id inside the signed message so an attacker cannot swap the
        // signed message produced for a victim's id onto another attacker-generated
        // id (QR-code relay attack).
        const id = uuidv4()
        const issuedAtIso = new Date().toISOString()
        const message = `[XDCmaster ${issuedAtIso}] Login id=${id}`
        res.send({
            message,
            url: urljoin(config.get('baseUrl'), `api/auth/verifyLogin?id=${id}`),
            id
        })
    } catch (e) {
        next(e)
    }
})

router.post('/verifyLogin', [
    query('id').isUUID(4).withMessage('id must be a UUID v4'),
    check('message').isLength({ min: 1, max: 2048 }).exists().withMessage('message is required'),
    check('signature').isLength({ min: 1, max: 256 }).exists().withMessage('signature is required'),
    check('signer').isLength({ min: 1, max: 128 }).exists().withMessage('signer is required')
], async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return next(errors.array())
    }
    try {
        const message = String(req.body.message)
        const signature = String(req.body.signature)
        const id = req.query.id
        if (!isValidUuid(id)) {
            throw Error('wrong id format')
        }
        const signer = String(req.body.signer).toLowerCase()

        // Require the canonical "[XDCmaster <iso>] Login id=<uuid>" shape.
        // The earlier two-step (substring + optional regex) check let an
        // attacker strip the "[XDCmaster ...]" prefix to skip the TTL window
        // entirely while still matching the id=<uuid> substring (CodeRabbit
        // #49). Anchoring the regex and rejecting unparseable timestamps
        // makes both checks fail-secure.
        const tsMatch = message.match(/^\[XDCmaster ([^\]]+)\] Login id=([^\s]+)$/)
        if (!tsMatch || tsMatch[2] !== id) {
            throw Error('message does not match expected login format')
        }
        const signedAt = Date.parse(tsMatch[1])
        if (isNaN(signedAt) || Math.abs(Date.now() - signedAt) > LOGIN_SIGNATURE_TTL_MS) {
            throw Error('login signature expired')
        }

        const signedAddress = (ecRecover(message, signature) || '').toLowerCase()

        if (signer !== signedAddress) {
            throw Error('The Signature Message Verification Failed')
        }

        // Single-use binding: enforce that this signedId can only be claimed by
        // exactly one signedAddress. Looking up by signedAddress alone (the
        // upstream behaviour) lets a second wallet overwrite the same login
        // session — i.e. an attacker who scans the victim's QR with their own
        // wallet hijacks the SPA polling /getLoginResult.
        const existingForId = await db.Signature.findOne({ signedId: id })
        if (existingForId && existingForId.signedAddress.toLowerCase() !== signedAddress) {
            throw Error('Cannot use a QR code twice')
        }
        if (existingForId && existingForId.signedAddress.toLowerCase() === signedAddress) {
            // Idempotent retry from the same legitimate signer. Treat as success.
            return res.send('Done')
        }

        try {
            await db.Signature.findOneAndUpdate(
                { signedAddress: signedAddress },
                { $set: { signedId: id, message, signature, expiredAt: new Date() } },
                { upsert: true, new: true }
            )
        } catch (e) {
            // E11000 from the unique signedId index: another wallet beat us to it.
            if (e && e.code === 11000) {
                throw Error('Cannot use a QR code twice')
            }
            throw e
        }
        return res.send('Done')
    } catch (e) {
        logger.warn('verifyLogin failed: %s', e.message || e)
        return next(e)
    }
})

router.get('/getLoginResult', [
    query('id').isUUID(4).withMessage('id must be a UUID v4')
], async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return next(errors.array())
    }
    try {
        const messId = req.query.id
        if (!isValidUuid(messId)) {
            return next(new Error('wrong id format'))
        }

        const signature = await db.Signature.findOne({ signedId: messId })

        if (signature) {
            return res.json({
                user: signature.signedAddress
            })
        } else {
            return res.send({
                error: {
                    message: 'No data'
                }
            })
        }
    } catch (e) {
        next(e)
    }
})
// Get signed address
function ecRecover (message, signature) {
    const signatureBuffer = utils.toBuffer(signature)
    const signatureParams = utils.fromRpcSig(signatureBuffer)

    const buffer = Buffer.from(message)
    const msgBuffer = '0x' + buffer.toString('hex')
    const m = utils.toBuffer(msgBuffer)
    const msgHash = utils.hashPersonalMessage(m)

    const publicKey = utils.ecrecover(
        msgHash,
        signatureParams.v,
        signatureParams.r,
        signatureParams.s
    )
    const addressBuffer = utils.publicToAddress(publicKey)
    return utils.bufferToHex(addressBuffer)
}

module.exports = router
