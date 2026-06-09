'use strict'
const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')
const web3 = require('../models/blockchain/web3rpc').Web3RpcInternal()
const { recoverPersonalSignAddress, isValidEIP1271Signature } = require('../helpers/personalSign')

const IPFS_API_ADD_URL = 'https://ipfs.xinfin.network/api/v0/add'

function toHexAddress (address) {
    if (!address || typeof address !== 'string') return ''
    const lower = address.toLowerCase()
    if (lower.startsWith('xdc')) return '0x' + lower.substring(3)
    return lower
}

function normalizeValue (value) {
    if (value === undefined || value === null) return ''
    if (Array.isArray(value)) {
        if (value.length === 0) return ''
        value = value[0]
    }
    if (value === undefined || value === null) return ''
    return String(value).trim().replace(/^["']|["']$/g, '')
}

function addressesMatch (a, b) {
    const aHex = toHexAddress(a)
    const bHex = toHexAddress(b)
    return Boolean(aHex && bHex && aHex === bHex)
}

function unauthorized (res, reason) {
    return res.status(401).json({
        message: 'Unauthorized',
        reason: reason
    })
}

function addFileToXinfinIpfs (buffer, filename, callback) {
    const form = new FormData()
    form.append('file', buffer, {
        filename: filename || 'kyc.pdf',
        contentType: 'application/pdf',
        knownLength: buffer.length
    })

    axios.post(IPFS_API_ADD_URL, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    }).then((response) => {
        const hash = response.data && response.data.Hash
        if (!hash) {
            return callback(new Error('IPFS API did not return a hash'))
        }
        callback(null, [{ hash: hash }])
    }).catch(callback)
}

if (!fs.existsSync(path.join(__dirname, '../tmp/'))) {
    fs.mkdirSync(path.join(__dirname, '../tmp/'))
}

router.post('/addKYC', async function (req, res, next) {
    const account = normalizeValue(
        req.body.account ||
        req.headers['x-kyc-account'] ||
        req.query.account
    ).toLowerCase()
    const message = normalizeValue(
        req.body.message ||
        req.headers['x-kyc-message'] ||
        req.query.message
    )
    const signedMessage = normalizeValue(
        req.body.signedMessage ||
        req.headers['x-kyc-signature'] ||
        req.query.signedMessage
    )

    if (!account || !message || !signedMessage) {
        console.warn('addKYC unauthorized: missing_auth_fields', {
            hasBodyAccount: Boolean(req.body && req.body.account),
            hasQueryAccount: Boolean(req.query && req.query.account),
            hasHeaderAccount: Boolean(req.headers['x-kyc-account'])
        })
        return unauthorized(res, 'missing_auth_fields')
    }

    // 1. Verify Timestamp to prevent Replay Attacks
    // Message format: "[XDCmaster KYC YYYY-MM-DDTHH:mm:ssZ] Upload KYC for xdc..."
    const timestampMatch = message.match(/\[XDCmaster KYC (.+?)\]/)
    if (!timestampMatch) {
        return unauthorized(res, 'invalid_message_format')
    }

    const signedTime = new Date(timestampMatch[1]).getTime()
    const currentTime = new Date().getTime()
    const fifteenMinutes = 15 * 60 * 1000

    if (isNaN(signedTime) || Math.abs(currentTime - signedTime) > fifteenMinutes) {
        console.warn('addKYC unauthorized: signature_expired', { signedTime, currentTime })
        return unauthorized(res, 'signature_expired')
    }

    // 2. Recover Signer (Ledger / hardware wallets may use alternate v bytes)
    let recovered = await recoverPersonalSignAddress(message, signedMessage)
    if (!recovered) {
        const candidateMessages = [message]
        try {
            candidateMessages.push(web3.utils.utf8ToHex(message))
        } catch (e) {}
        try {
            candidateMessages.push(web3.utils.sha3(message))
        } catch (e) {}

        for (const candidateMessage of candidateMessages) {
            try {
                recovered = (await web3.eth.accounts.recover(candidateMessage, signedMessage) || '').toLowerCase()
                if (recovered) break
            } catch (e) {}
        }
    }

    let isValidEIP1271 = false
    if (!recovered || !addressesMatch(recovered, account)) {
        isValidEIP1271 = await isValidEIP1271Signature(account, message, signedMessage)
    }

    if (!recovered && !isValidEIP1271) {
        console.warn('addKYC unauthorized: signature_recover_failed', {
            account: toHexAddress(account),
            messageLength: message.length
        })
        return unauthorized(res, 'signature_recover_failed')
    }

    if (recovered && !addressesMatch(recovered, account) && !isValidEIP1271) {
        console.warn('addKYC unauthorized: signer_mismatch', {
            account: toHexAddress(account),
            recovered: toHexAddress(recovered)
        })
        return unauthorized(res, 'signer_mismatch')
    }

    console.log('File Name : ', req.files)
    if (!req.files || !req.files.filename) {
        return res.status(400).json({ message: 'No file uploaded' })
    }

    let imageFile = req.files.filename

    // 10MB validation
    const maxSize = 10 * 1024 * 1024
    if (imageFile.size > maxSize) {
        return res.status(400).json({
            message: 'File size should not exceed 10MB'
        })
    }

    addFileToXinfinIpfs(imageFile.data, imageFile.name, async (err, ipfsHash) => {
        if (err != null) {
            console.error('Some error occured while adding KYC at /addKYC: ', err)
            return res.status(500).send(err)
        }

        let hash = ipfsHash[0].hash
        console.log(`Uploaded file; hash: ${hash}`)

        res.status(200).json({ hash })
    })

    // imageFile.mv(path.join(__dirname, '../tmp/', name), function (err) {
    //     if (err) {
    //         return res.status(500).send(err)
    //     }
    //     const filePath = path.join(__dirname, '/../tmp/', name)
    //     exec(
    //         `IPFS_PATH=~/.ipfs1 ipfs add ${filePath}`,
    //         async (error, stdout, stderr) => {
    //             if (error != null) {
    //                 res.status(500).send(error)
    //             }
    //             var words = stdout.split(' ')
    //             console.log('WORDS', words)
    //             for (var i = 0; i < words.length; i++) {
    //                 if (words[i][0] === 'Q') hash = words[i]
    //             }
    //             console.log('HASH : ', hash)
    //             console.log('deleting : ', filePath)
    //             fs.unlink(filePath, err => {
    //                 if (err) throw err
    //                 console.log('File successfully deleted')
    //                 res.status(200).json({ 'hash':hash })
    //             })
    //         }
    //     )
    // })
})

module.exports = router
