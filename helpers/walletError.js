'use strict'

const LEDGER_REJECT_CODES = [0x6985, 27013, '6985']

function formatWalletError (error) {
    if (!error) {
        return 'Unknown wallet error'
    }
    if (typeof error === 'string') {
        return error
    }
    if (error instanceof Error && error.message) {
        return formatWalletError(error.message)
    }

    const statusCode = error.statusCode || error.id
    if (LEDGER_REJECT_CODES.includes(statusCode) ||
        (error.message && /rejected|denied|6985|cancel/i.test(error.message))) {
        return 'Transaction rejected on Ledger device.'
    }
    if (statusCode === 0x6a80 ||
        error.name === 'EthAppPleaseEnableContractData' ||
        (error.message && /0x6a80|contract data/i.test(error.message))) {
        return 'Enable Blind signing and Contract data on the XDC Network app (path m/44\'/550\'/0\'/0): ' +
            'open the app → Settings. If Blind signing is already ON, also enable Contract data. ' +
            'Enable Developer mode in Ledger Live if options are missing, then unplug/reconnect and retry.'
    }
    if (statusCode === 0x6a15 || (error.message && /0x6a15/i.test(error.message))) {
        return 'Ledger derivation path not supported. Check your HD path in Settings.'
    }

    if (error.message) {
        const message = String(error.message)
        if (/invalid sender/i.test(message)) {
            return 'Network rejected the transaction (invalid sender). Reconnect Ledger, confirm the correct wallet in Settings, and try again.'
        }
        return message
    }
    if (error.reason) {
        return String(error.reason)
    }
    if (error.response && error.response.data) {
        const data = error.response.data
        if (typeof data === 'string') return data
        if (data.message) return String(data.message)
        if (data.reason) return String(data.reason)
    }
    if (error.data && error.data.message) {
        return String(error.data.message)
    }

    try {
        const serialized = JSON.stringify(error)
        if (serialized && serialized !== '{}') {
            return serialized
        }
    } catch (e) {}

    return 'Wallet transaction failed. Please try again.'
}

function toWalletError (error) {
    if (error instanceof Error) {
        error.message = formatWalletError(error)
        return error
    }
    return new Error(formatWalletError(error))
}

module.exports = {
    formatWalletError,
    toWalletError
}
