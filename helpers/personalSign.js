'use strict'

const ethUtil = require('ethereumjs-util')
const web3 = require('../models/blockchain/web3rpc').Web3RpcInternal()

function toHexAddress (address) {
    if (!address || typeof address !== 'string') return ''
    const lower = address.toLowerCase()
    if (lower.startsWith('xdc')) return '0x' + lower.substring(3)
    return lower
}

function normalizeHex (value) {
    if (!value) return ''
    const hex = String(value).trim()
    return hex.startsWith('0x') ? hex : '0x' + hex
}

function signatureVariants (signedMessage) {
    const sigBuf = ethUtil.toBuffer(normalizeHex(signedMessage))
    if (sigBuf.length !== 65) {
        return [signedMessage]
    }
    const r = sigBuf.slice(0, 32)
    const s = sigBuf.slice(32, 64)
    const vRaw = sigBuf[64]
    const vValues = new Set()
    if (vRaw >= 27) {
        vValues.add(vRaw)
    } else {
        vValues.add(vRaw + 27)
        vValues.add(27)
        vValues.add(28)
    }
    return Array.from(vValues).map((v) => ethUtil.toRpcSig(v, r, s))
}

function messageVariants (message) {
    const variants = [message]
    try {
        variants.push(web3.utils.utf8ToHex(message))
    } catch (e) {}
    return variants.filter((m, i, arr) => m && arr.indexOf(m) === i)
}

async function recoverPersonalSignAddress (message, signedMessage) {
    const variants = signatureVariants(signedMessage)
    const messages = messageVariants(message)

    for (const candidateMessage of messages) {
        for (const variant of variants) {
            try {
                const recovered = (await web3.eth.accounts.recover(candidateMessage, variant) || '').toLowerCase()
                if (recovered) {
                    return recovered
                }
            } catch (e) {}
        }
    }

    const msgHash = ethUtil.hashPersonalMessage(Buffer.from(message))
    for (const variant of variants) {
        const sigBuf = ethUtil.toBuffer(variant)
        if (sigBuf.length !== 65) continue
        const vRaw = sigBuf[64]
        const recoveryIds = new Set()
        if (vRaw >= 27) {
            recoveryIds.add(vRaw - 27)
        } else {
            recoveryIds.add(vRaw)
        }
        recoveryIds.add(0)
        recoveryIds.add(1)
        for (const recoveryId of recoveryIds) {
            try {
                const pubKey = ethUtil.ecrecover(
                    msgHash,
                    recoveryId + 27,
                    sigBuf.slice(0, 32),
                    sigBuf.slice(32, 64)
                )
                const recovered = ('0x' + ethUtil.pubToAddress(pubKey).toString('hex')).toLowerCase()
                if (recovered) {
                    return recovered
                }
            } catch (e) {}
        }
    }
    return ''
}

module.exports = {
    toHexAddress,
    recoverPersonalSignAddress
}
