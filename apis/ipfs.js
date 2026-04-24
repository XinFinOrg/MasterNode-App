'use strict'
const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const IpfsClient = require('ipfs-http-client')
const config = require('config')
const web3 = require('../models/blockchain/web3rpc').Web3RpcInternal()

const xinFinClient = new IpfsClient({
    host: 'ipfs.xinfin.network',
    port: 443,
    protocol: 'https'
})

function toHexAddress (address) {
    if (!address || typeof address !== 'string') return ''
    const lower = address.toLowerCase()
    if (lower.startsWith('xdc')) return '0x' + lower.substring(3)
    return lower
}

function normalizeValue (value) {
    if (value === undefined || value === null) return ''
    return String(value).trim().replace(/^["']|["']$/g, '')
}

function unauthorized (res, reason) {
    const payload = { message: 'Unauthorized' }
    if (process.env.NODE_ENV === 'development') {
        payload.reason = reason
    }
    return res.status(401).json(payload)
}

if (!fs.existsSync(path.join(__dirname, '../tmp/'))) {
    fs.mkdirSync(path.join(__dirname, '../tmp/'))
}

router.post('/addKYC', async function (req, res, next) {
    const expectedApiKey = config.has('security.ipfsUploadApiKey')
        ? config.get('security.ipfsUploadApiKey')
        : ''
    const providedApiKey = req.headers['x-api-key'] || ''
    const hasValidApiKey = !!expectedApiKey && providedApiKey === expectedApiKey

    if (!hasValidApiKey) {
        const account = normalizeValue(req.body.account || req.headers['x-kyc-account'] || req.query.account).toLowerCase()
        const message = normalizeValue(req.body.message || req.headers['x-kyc-message'] || req.query.message)
        const signedMessage = normalizeValue(req.body.signedMessage || req.headers['x-kyc-signature'] || req.query.signedMessage)
        if (!account || !message || !signedMessage) {
            return unauthorized(res, 'missing_auth_fields')
        }

        let recovered = ''
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

        if (!recovered) {
            return unauthorized(res, 'signature_recover_failed')
        }

        const recoveredHex = toHexAddress(recovered)
        const accountHex = toHexAddress(account)
        if (!recoveredHex || !accountHex || recoveredHex !== accountHex) {
            return unauthorized(res, 'signer_mismatch')
        }
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

    xinFinClient.add(imageFile.data, async (err, ipfsHash) => {
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
