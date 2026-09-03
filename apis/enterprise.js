'use strict'
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const config = require('config')
const db = require('../models/mongodb')

const { addFileToXinfinIpfs } = require('../helpers/ipfs')
const kycLogger = require('../middlewares/kycLogger')

function unauthorized (res, reason) {
    return res.status(401).json({
        message: 'Unauthorized',
        reason: reason
    })
}

// Manually create API key and secret for an enterprise
router.post('/keys', async (req, res) => {
    try {
        const authHeader = req.headers['authorization']
        const expectedToken = config.get('enterpriseMasterToken')

        if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
            return unauthorized(res, 'invalid_master_token')
        }

        const enterpriseName = req.body.enterpriseName
        if (!enterpriseName) {
            return res.status(400).json({ message: 'enterpriseName is required' })
        }

        const apiKey = crypto.randomBytes(16).toString('hex')
        const apiSecret = crypto.randomBytes(32).toString('hex')

        await db.EnterpriseKey.create({
            apiKey,
            apiSecret,
            enterpriseName
        })

        res.status(201).json({
            message: 'Enterprise API credentials generated successfully. Save the apiSecret as it will not be shown again.',
            enterpriseName,
            apiKey,
            apiSecret
        })
    } catch (err) {
        console.error('Error creating enterprise keys:', err)
        res.status(500).send('Internal Server Error')
    }
})

// Enterprise addKYC endpoint
router.post('/addKYC', kycLogger, async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key']
        const apiTimestamp = req.headers['x-api-timestamp']
        const apiSignature = req.headers['x-api-signature']
        const apiNonce = req.headers['x-api-nonce']

        if (!apiKey || !apiTimestamp || !apiSignature || !apiNonce) {
            return unauthorized(res, 'missing_auth_headers')
        }

        // Validate timestamp (5 minutes window)
        const requestTime = parseInt(apiTimestamp, 10)
        const currentTime = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > fiveMinutes) {
            return unauthorized(res, 'timestamp_expired')
        }

        // Check if nonce has already been used to prevent replay
        const nonceExists = await db.EnterpriseNonce.findOne({ apiKey, nonce: apiNonce })
        if (nonceExists) {
            return unauthorized(res, 'nonce_reused')
        }

        // Validate file presence
        if (!req.files || !req.files.filename) {
            return res.status(400).json({ message: 'No file uploaded' })
        }

        const uploadedFile = req.files.filename

        // Strict PDF checks: mimetype AND filename AND magic bytes
        const isPdfMagic = uploadedFile.data && uploadedFile.data.length >= 5 &&
            uploadedFile.data.toString('ascii', 0, 5) === '%PDF-'

        if (uploadedFile.mimetype !== 'application/pdf' || !uploadedFile.name.toLowerCase().endsWith('.pdf') || !isPdfMagic) {
            return res.status(400).json({ message: 'Only PDF files are allowed' })
        }

        // 10MB validation
        const maxSize = 10 * 1024 * 1024
        if (uploadedFile.size > maxSize) {
            return res.status(400).json({ message: 'File size should not exceed 10MB' })
        }

        // Fetch enterprise key and select select: false fields (apiSecret)
        const enterprise = await db.EnterpriseKey.findOne({ apiKey }).select('+apiSecret')
        if (!enterprise) {
            return unauthorized(res, 'invalid_api_key')
        }

        // Hash of file content
        const fileHash = crypto.createHash('sha256').update(uploadedFile.data).digest('hex')

        // Validate signature
        // We expect signature to be HMAC SHA256 of "METHOD:PATH:TIMESTAMP:NONCE:FILENAME:FILESIZE:FILEHASH"
        const method = req.method.toUpperCase()
        const path = req.originalUrl.split('?')[0] // Strip query params just in case
        const stringToSign = `${method}:${path}:${apiTimestamp}:${apiNonce}:${uploadedFile.name}:${uploadedFile.size}:${fileHash}`

        const expectedSignature = crypto
            .createHmac('sha256', enterprise.apiSecret)
            .update(stringToSign)
            .digest('hex')

        if (typeof apiSignature !== 'string') {
            return unauthorized(res, 'invalid_signature')
        }

        const sigBuf = Buffer.from(apiSignature, 'hex')
        const expectedBuf = Buffer.from(expectedSignature, 'hex')

        if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
            return unauthorized(res, 'invalid_signature')
        }

        // Save nonce to prevent future replay
        await db.EnterpriseNonce.create({ apiKey, nonce: apiNonce })

        // Upload to IPFS
        addFileToXinfinIpfs(uploadedFile.data, uploadedFile.name, async (err, ipfsHash) => {
            if (err != null) {
                console.error('Some error occured while adding KYC at /enterprise/addKYC: ', err)
                return res.status(500).send('IPFS Upload Error')
            }

            let hash = ipfsHash[0].hash
            res.status(200).json({ hash })
        })
    } catch (err) {
        console.error('Error in /enterprise/addKYC:', err)
        res.status(500).send('Internal Server Error')
    }
})

module.exports = router
