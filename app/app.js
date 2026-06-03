import Vue from 'vue'
import VueRouter from 'vue-router'
import VueAnalytics from 'vue-analytics'
import App from './App.vue'
import routes from './routes'

import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import 'vue2-dropzone/dist/vue2Dropzone.min.css'
import Web3 from 'xdc3'
import { EthereumProvider } from '@walletconnect/ethereum-provider'
// import { default as contract } from 'truffle-contract'
// import XDCValidatorArtifacts from '../contracts/XDCValidator.json'
import Toasted from 'vue-toasted'
import axios from 'axios'
// import BigNumber from 'bignumber.js'
// import HighchartsVue from 'highcharts-vue'
// import Highcharts from 'highcharts'
// import stockInit from 'highcharts/modules/stock'
import VueClipboards from 'vue-clipboards'
import Vuex from 'vuex'
// import HDWalletProvider from 'truffle-hdwallet-provider'
import { HDWalletProvider } from '../helpers.js'
import { createLedgerWeb3Provider } from '../helpers/ledgerWeb3Provider.js'
import {
    formatWalletError,
    toWalletError,
    isWalletConnectUserCancelError
} from '../helpers/walletError.js'
import localStorage from 'store'
// Libusb is included as a submodule.
// On Linux, you'll need libudev to build libusb.
// On Ubuntu/Debian: sudo apt-get install build-essential libudev-dev
// import Transport from '@ledgerhq/hw-transport-node-hid'

import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import Eth from '@ledgerhq/hw-app-eth'
import openApp from '@ledgerhq/live-common/lib/hw/openApp'
import getAppAndVersion from '@ledgerhq/live-common/lib/hw/getAppAndVersion'
import attemptToQuitApp from '@ledgerhq/live-common/lib/hw/attemptToQuitApp'
import TrezorConnect from 'trezor-connect'
import Transaction from 'ethereumjs-tx'
import * as HDKey from 'hdkey'
import * as ethUtils from 'ethereumjs-util'
import Meta from 'vue-meta'
import Helper from './utils'

const LEDGER_APP_ETHEREUM = 'Ethereum'
const LEDGER_APP_XDC = 'XDC Network'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const getHdBasePath = () => {
    let path = localStorage.get('hdDerivationPath') || getDefaultLedgerBasePath()
    if (path.split('/').length > 5 && /\/\d+$/.test(path)) {
        path = path.replace(/\/\d+$/, '')
    }
    return path
}

const getCoinTypeFromPath = (path) => {
    const match = (path || '').match(/44'\/(\d+)'/)
    return match ? Number(match[1]) : 60
}

const usesXdcAddressPrefix = (path) => {
    const coinType = getCoinTypeFromPath(path)
    return coinType === 550 || coinType === 551
}

const getCurrencySymbolByHdPath = (path) => {
    if (usesXdcAddressPrefix(path)) {
        return 'XDC'
    }
    if (getCoinTypeFromPath(path) === 60) {
        return 'ETH'
    }
    return 'XDC'
}

const toRpcAddress = (address) => {
    if (!address) {
        return address
    }
    const normalized = address.toLowerCase()
    if (normalized.startsWith('xdc')) {
        return '0x' + normalized.substring(3)
    }
    if (!normalized.startsWith('0x')) {
        return '0x' + normalized
    }
    return normalized
}

const normalizeTxHash = (hash) => {
    if (!hash) {
        return hash
    }
    const normalized = String(hash).toLowerCase()
    if (normalized.startsWith('xdc')) {
        return '0x' + normalized.substring(3)
    }
    return normalized
}

const toHexBuffer = (value) => {
    if (Buffer.isBuffer(value)) {
        return value
    }
    const hex = String(value).trim()
    return ethUtils.toBuffer(hex.startsWith('0x') ? hex : '0x' + hex)
}

const formatAddressByHdPath = (address, path) => {
    if (!address) {
        return ''
    }
    const rpcAddress = toRpcAddress(address)
    const hdPath = path || getHdBasePath()
    if (usesXdcAddressPrefix(hdPath)) {
        return 'xdc' + rpcAddress.substring(2)
    }
    return rpcAddress
}

// Ledger firmware uses SLIP-0044 coin type 550; 551 is accepted in the UI and mapped on device if needed.
const normalizeLedgerPath = (path) => (path || '').replace(/44'\/551'/g, "44'/550'")

const isLedgerPathError = (error) => error && (
    error.statusCode === 0x6a15 ||
    (error.message && error.message.indexOf('0x6a15') >= 0)
)

const ledgerGetAddress = async (appEth, userPath) => {
    const pathsToTry = (userPath || '').indexOf("551'") >= 0
        ? [userPath, normalizeLedgerPath(userPath)]
        : [userPath]

    let lastError
    for (let i = 0; i < pathsToTry.length; i++) {
        const devicePath = pathsToTry[i]
        try {
            const result = await appEth.getAddress(devicePath, false, true)
            if (devicePath !== userPath) {
                localStorage.set('ledgerDevicePath', devicePath)
                localStorage.set(
                    'ledgerPathFallbackMessage',
                    `Path ${userPath} is not supported on Ledger; using ${devicePath} for this session.`
                )
            } else {
                localStorage.remove('ledgerDevicePath')
                localStorage.remove('ledgerPathFallbackMessage')
            }
            return result
        } catch (error) {
            lastError = error
            if (!isLedgerPathError(error) || i === pathsToTry.length - 1) {
                throw error
            }
        }
    }
    throw lastError
}

const isXdcLedgerAppName = (name) => /xdc|xinfin/i.test(name || '')

const isEthereumLedgerAppName = (name) => (name || '') === LEDGER_APP_ETHEREUM

const isAcceptedLedgerApp = (openedApp, wantsXdcPath) => {
    if (wantsXdcPath) {
        return isXdcLedgerAppName(openedApp) || isEthereumLedgerAppName(openedApp)
    }
    return isEthereumLedgerAppName(openedApp)
}

const getDefaultLedgerBasePath = () => {
    const config = localStorage.get('configMaster')
    const networkId = Number(config && config.blockchain && config.blockchain.networkId)

    if (networkId === 50) {
        return `m/44'/550'/0'/0`
    }
    if (networkId === 51 || networkId === 551) {
        return `m/44'/551'/0'/0`
    }
    return `m/44'/60'/0'/0`
}

const getLedgerAppOptions = (path) => {
    const coinTypeMatch = (path || '').match(/44'\/(\d+)'/)
    const coinType = coinTypeMatch ? Number(coinTypeMatch[1]) : null

    if (coinType === 550 || coinType === 551) {
        return {
            preferred: LEDGER_APP_XDC,
            wantsXdcPath: true
        }
    }

    return {
        preferred: LEDGER_APP_ETHEREUM,
        wantsXdcPath: false
    }
}

const getLedgerBasePath = () => {
    let basePath = localStorage.get('ledgerDevicePath') ||
        localStorage.get('hdDerivationPath') ||
        getDefaultLedgerBasePath()

    const segments = basePath.split('/')
    if (segments.length > 5 && /^\d+$/.test(segments[segments.length - 1])) {
        basePath = basePath.replace(/\/\d+$/, '')
    }
    return basePath
}

// Account path for unlock / wallet list (e.g. m/44'/550'/0'/0).
const getLedgerAccountPath = () => getLedgerBasePath()

// Full path for signing / getAddress without payload (e.g. m/44'/550'/0'/0/0).
const getLedgerPath = (index = null) => {
    const basePath = getLedgerBasePath()

    if (index !== null && index !== undefined) {
        return `${basePath}/${index}`
    }

    return basePath
}

const getLedgerBlindSigningHelp = (path) => {
    const { preferred } = getLedgerAppOptions(path || getLedgerAccountPath())
    return `Contract signing failed on "${preferred}". On the device (not Ledger Live): open "${preferred}" → ` +
        'Settings → enable "Blind signing" AND "Contract data" if both appear (enable Developer mode in Ledger Live first). ' +
        'If Blind signing is already ON, turn Contract data ON as well, then quit the app, unplug Ledger, reconnect, and retry.'
}

// ethereumjs-tx leaves v=0x1c by default; Ledger needs EIP-155 v=chainId, r=0, s=0 on unsigned txs.
const prepareUnsignedLedgerTx = (txFields) => {
    const tx = new Transaction(txFields)
    const chainId = tx.getChainId()
    if (chainId > 0) {
        tx.v = chainId
        tx.r = Buffer.alloc(0)
        tx.s = Buffer.alloc(0)
    }
    return tx
}

const isLedgerContractDataError = (error) => {
    if (!error) return false
    return error.statusCode === 0x6a80 ||
        error.name === 'EthAppPleaseEnableContractData' ||
        (error.message && /0x6a80|contract data/i.test(error.message))
}

const signLedgerTransaction = async (appEth, path, serializedRawTx) => {
    // null resolution = blind signing (required for custom validator contract calls on XDC)
    return appEth.signTransaction(path, serializedRawTx, null)
}

const formatLedgerError = (error, path) => {
    const displayPath = normalizeLedgerPath(path)

    if (isLedgerContractDataError(error)) {
        return new Error(getLedgerBlindSigningHelp(path))
    }

    if (error && (error.statusCode === 0x6a15 || (error.message && error.message.indexOf('0x6a15') >= 0))) {
        if ((path || '').indexOf("551'") >= 0) {
            return new Error(
                'Ledger does not support coin type 551. Use path m/44\'/550\'/0\'/0 ' +
                'with the XDC Network app open (same path for mainnet and Apothem).'
            )
        }
        return new Error(
            `Could not read address at "${displayPath}". Keep the XDC Network app open ` +
            `(do not switch apps), then try again. If it persists, try m/44'/60'/0'/0 with the Ethereum app.`
        )
    }
    if (error instanceof Error) {
        return error
    }
    return toWalletError(error)
}

const normalizeLedgerTxParams = (txParams) => {
    const tx = Object.assign({}, txParams)
    if (tx.from) {
        tx.from = toRpcAddress(tx.from)
    }
    if (tx.to) {
        tx.to = toRpcAddress(tx.to)
    }
    if (tx.gasLimit && !tx.gas) {
        tx.gas = tx.gasLimit
    }
    if (tx.gas && !tx.gasLimit) {
        tx.gasLimit = tx.gas
    }
    return tx
}

const pickLedgerTxFields = (txParams) => {
    const normalized = normalizeLedgerTxParams(txParams)
    return {
        nonce: normalized.nonce,
        gasPrice: normalized.gasPrice,
        gasLimit: normalized.gasLimit,
        to: normalized.to,
        value: normalized.value || '0x0',
        data: normalized.data || '0x'
    }
}

const formatLedgerSignature = (signature) => {
    const formatted = {}
    ;['v', 'r', 's'].forEach((key) => {
        let val = signature[key]
        if (val === undefined || val === null) {
            return
        }
        if (typeof val === 'number') {
            val = val.toString(16)
        }
        val = String(val).trim()
        if (!val.startsWith('0x')) {
            val = '0x' + val
        }
        formatted[key] = val
    })
    return formatted
}

const serializeSignedTxForRpc = (tx) => {
    return 'xdc' + tx.serialize().toString('hex')
}

const createLedgerEth = async (path) => {
    const { preferred, wantsXdcPath } = getLedgerAppOptions(path)
    let transport = await TransportWebUSB.create()

    let currentApp = await getAppAndVersion(transport)
    let openedApp = currentApp.name

    if (openedApp === 'BOLOS') {
        throw new Error(`Unlock your Ledger and open the "${preferred}" app.`)
    }

    // Do not quit the app if the user already has a compatible app open (e.g. "XDC.Network").
    if (!isAcceptedLedgerApp(openedApp, wantsXdcPath)) {
        await attemptToQuitApp(transport, openedApp)
        await delay(2000)
        transport = await TransportWebUSB.create()
        currentApp = await getAppAndVersion(transport)
        openedApp = currentApp.name

        if (!isAcceptedLedgerApp(openedApp, wantsXdcPath)) {
            await openApp(transport, preferred)
            await delay(2500)
            transport = await TransportWebUSB.create()
            currentApp = await getAppAndVersion(transport)
            openedApp = currentApp.name
        }
    }

    if (!isAcceptedLedgerApp(openedApp, wantsXdcPath)) {
        throw new Error(
            `Wrong Ledger app open ("${openedApp}"). Open the XDC Network app and try again.`
        )
    }

    return new Eth(transport)
}

const getLedgerCoinType = (path) => {
    const coinTypeMatch = (path || '').match(/44'\/(\d+)'/)
    const coinType = coinTypeMatch ? Number(coinTypeMatch[1]) : null
    if (coinType === 551) {
        return 550
    }
    return coinType
}

const ensureLedgerEth = async (path) => {
    const coinType = getLedgerCoinType(path)

    if (Vue.prototype.ledgerCoinType !== undefined &&
        Vue.prototype.ledgerCoinType !== coinType &&
        Vue.prototype.appEth) {
        try {
            await Vue.prototype.appEth.transport.close()
        } catch (e) {
            // ignore close errors
        }
        Vue.prototype.appEth = null
    }

    if (!Vue.prototype.appEth) {
        Vue.prototype.appEth = await createLedgerEth(path)
        Vue.prototype.ledgerCoinType = coinType
    }

    return Vue.prototype.appEth
}

Vue.use(Meta)
Vue.use(BootstrapVue)
Vue.use(VueClipboards)

Vue.use(Toasted, {
    position: 'bottom-right',
    theme: 'bubble',
    duration: 4000,
    action : {
        text : 'Dismiss',
        onClick : (e, toastObject) => {
            toastObject.goAway(0)
        }
    },
    singleton: true
})

// set trezor's manifest
TrezorConnect.manifest({
    email: 'admin@xinfin.network',
    appUrl: 'https://master.xinfin.network'
})

// stockInit(Highcharts)
// Vue.use(HighchartsVue)

// Vue.prototype.XDCValidator = contract(XDCValidatorArtifacts)
Vue.prototype.isElectron = !!(window && window.process && window.process.type)

let walletConnectProviderInstance = null
let walletConnectInitPromise = null

const WALLETCONNECT_PROJECT_ID_HELP =
    'WalletConnect needs a valid 32-character project ID. ' +
    'Create one at https://cloud.walletconnect.com, set WALLETCONNECT_PROJECT_ID in .env, ' +
    'add https://localhost:5000 to the project allowlist, then restart the server.'

const resolveWalletConnectProjectId = (blockchain) => {
    const projectId = blockchain && blockchain.walletconnectProjectId
    return typeof projectId === 'string' ? projectId.trim() : ''
}

const isValidWalletConnectProjectId = (projectId) =>
    typeof projectId === 'string' && /^[a-f0-9]{32}$/i.test(projectId.trim())

const assertWalletConnectConfigured = (blockchain) => {
    const projectId = resolveWalletConnectProjectId(blockchain)
    if (!isValidWalletConnectProjectId(projectId)) {
        throw new Error(WALLETCONNECT_PROJECT_ID_HELP)
    }
    return projectId
}

const resetWalletConnectProvider = () => {
    if (walletConnectProviderInstance && typeof walletConnectProviderInstance.disconnect === 'function') {
        try {
            walletConnectProviderInstance.disconnect()
        } catch (e) {}
    }
    walletConnectProviderInstance = null
    walletConnectInitPromise = null
}

const getWalletConnectProvider = async (showQrModal, blockchain) => {
    if (walletConnectProviderInstance) {
        return walletConnectProviderInstance
    }
    if (walletConnectInitPromise) {
        return walletConnectInitPromise
    }

    const dappUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://master.xinfin.network'

    const projectId = assertWalletConnectConfigured(blockchain)

    walletConnectInitPromise = EthereumProvider.init({
        projectId: projectId,
        showQrModal: showQrModal,
        qrModalOptions: { themeMode: 'light' },
        chains: [50],
        optionalChains: [1, 50],
        methods: ['eth_sendTransaction', 'personal_sign'],
        rpcMap: {
            [blockchain.networkId]: blockchain.rpc,
            51: 'https://rpc.apothem.network/'
        },
        metadata: {
            name: 'XDC Network Governance Dapp',
            description: 'Providing a professional UI which allows coin-holders to stake for masternodes, decentralized governance and explore masternode performance statistics',
            url: dappUrl,
            icons: ['https://master.xinfin.network/app/assets/img/logo.svg']
        }
    }).then((provider) => {
        walletConnectProviderInstance = provider
        return provider
    }).catch((error) => {
        walletConnectInitPromise = null
        throw error
    })

    return walletConnectInitPromise
}

Vue.prototype.resetWalletConnectProvider = resetWalletConnectProvider
Vue.prototype.isWalletConnectConfigured = (blockchain) =>
    isValidWalletConnectProjectId(resolveWalletConnectProjectId(blockchain))

Vue.prototype.resetWalletSession = function () {
    if (Vue.prototype.appEth && Vue.prototype.appEth.transport) {
        try {
            Vue.prototype.appEth.transport.close()
        } catch (e) {}
    }
    Vue.prototype.NetworkProvider = null
    Vue.prototype.web3 = null
    Vue.prototype.XDCValidator = null
    Vue.prototype.appEth = null
    Vue.prototype.ledgerPayload = null
    Vue.prototype.trezorPayload = null
    Vue.prototype.ledgerCoinType = undefined
    resetWalletConnectProvider()
}

// wallet-connect global provider (always starts a fresh session for login)
Vue.prototype.walletConnectProvider = async (blockchain) => {
    resetWalletConnectProvider()
    return getWalletConnectProvider(true, blockchain)
}

Vue.prototype.connectWalletConnect = async function (blockchain) {
    const provider = await Vue.prototype.walletConnectProvider(blockchain)
    try {
        await provider.connect()
    } catch (error) {
        resetWalletConnectProvider()
        throw error
    }
    return provider
}

Vue.prototype.isWalletConnectUserCancelError = isWalletConnectUserCancelError

Vue.prototype.setupProvider = async function (provider, wjs) {
    Vue.prototype.NetworkProvider = provider
    if (wjs instanceof Web3) {
        const config = await getConfig()
        localStorage.set('configMaster', config)
        Vue.prototype.web3 = wjs
        Vue.prototype.XDCValidator = new wjs.eth.Contract(
            Helper.XDCValidatorArtifacts.abi,
            config.blockchain.validatorAddress
        )
    }
}

Vue.prototype.getAccount = async function () {
    const provider = Vue.prototype.NetworkProvider || ''
    const wjs = Vue.prototype.web3
    let account
    switch (provider) {
    case 'connect-wallet':
        account = (await wjs.eth.getAccounts())[0]
        break
    case 'metamask':
        if (window.ethereum) {
            if (window.ethereum.request) {
                await window.ethereum.request({ method: 'eth_requestAccounts' })
            } else if (window.ethereum.enable) {
                await window.ethereum.enable()
            }
        } else if (window.xdcchain && window.xdcchain.enable) {
            await window.xdcchain.enable()
        }
        account = (await wjs.eth.getAccounts())[0]
        break
    case 'xinpay':
        // Request account access if needed - for metamask
        if (window.xdcchain) {
            await window.xdcchain.enable()
        }
        account = (await wjs.eth.getAccounts())[0]
        break
    case 'XDCwalletDapp':
        account = (await wjs.eth.getAccounts())[0]
        break
    case 'XDCwallet':
        account = this.$store.state.address
        break
    case 'custom':
        account = (await wjs.eth.getAccounts())[0]
        break
    case 'ledger':
        try {
            const offset = Number(localStorage.get('offset') || 0)
            const payload = Vue.prototype.ledgerPayload

            if (payload && payload.publicKey) {
                account = Vue.prototype.HDWalletCreate(payload, offset)
            } else {
                const path = getLedgerPath(offset)
                await ensureLedgerEth(path)
                const result = await ledgerGetAddress(Vue.prototype.appEth, path)
                account = formatAddressByHdPath(result.address, getLedgerPath(offset))
            }
        } catch (error) {
            console.log(error)
            throw formatLedgerError(error, getLedgerPath(
                Number(localStorage.get('offset') || 0)
            ))
        }
        break
    case 'trezor':
        const trezorPayload = Vue.prototype.trezorPayload || localStorage.get('trezorPayload')
        const trezorOffset = Number(localStorage.get('offset') || 0)
        if (!trezorPayload) {
            throw new Error('Trezor not unlocked. Please connect your device and try again.')
        }
        account = Vue.prototype.HDWalletCreate(trezorPayload, trezorOffset)
        localStorage.set('trezorPayload', { xpub: trezorPayload.xpub })
        break
    default:
        break
    }
    if (!account || account.length <= 0) {
        console.log(`Couldn't get any accounts! Make sure
            your Ethereum client is configured correctly.`)
    }
    return account
}

Vue.prototype.loadMultipleLedgerWallets = async function (offset, limit) {
    let u2fSupported = await TransportWebUSB.isSupported()
    if (!u2fSupported) {
        throw new Error(`WebUSB not supported in this browser. Please use Google Chrome with HTTPS.`)
    }

    const payload = Vue.prototype.ledgerPayload
    if (!payload || !payload.publicKey) {
        throw new Error('Ledger not unlocked. Please connect your device and try again.')
    }

    const config = localStorage.get('configMaster') || await getConfig()
    const rpcUrl = config.blockchain.rpc
    const balanceWeb3 = new Web3(new Web3.providers.HttpProvider(rpcUrl))

    const wallets = {}

    for (let i = offset; i < (offset + limit); i++) {
        try {
            const convertedAddress = Vue.prototype.HDWalletCreate(payload, i)
            let balance = '0.00'
            try {
                const balanceWei = await balanceWeb3.eth.getBalance(
                    convertedAddress
                )
                balance = parseFloat(balanceWeb3.utils.fromWei(balanceWei, 'ether')).toFixed(2)
            } catch (balanceError) {
                console.log(balanceError)
            }
            wallets[i] = {
                address: convertedAddress,
                balance: balance
            }
        } catch (deriveError) {
            console.log(deriveError)
        }
    }

    if (Object.keys(wallets).length === 0) {
        throw new Error('Could not derive wallet addresses from your Ledger.')
    }

    return wallets
}

Vue.prototype.unlockTrezor = async () => {
    try {
        const result = await TrezorConnect.getPublicKey({
            path: localStorage.get('hdDerivationPath')
        })
        Vue.prototype.trezorPayload = result.payload
    } catch (error) {
        console.log(error)
        throw error
    }
}

Vue.prototype.unlockLedger = async () => {
    const userPath = getLedgerAccountPath()
    try {
        await ensureLedgerEth(userPath)

        const result = await ledgerGetAddress(Vue.prototype.appEth, userPath)
        Vue.prototype.ledgerPayload = result
    } catch (error) {
        console.log(error)
        throw formatLedgerError(error, userPath)
    }
}

Vue.prototype.HDWalletCreate = (payload, index) => {
    const provider = Vue.prototype.NetworkProvider
    let derivedKey
    if (provider === 'trezor') {
        const xpub = payload.xpub
        const hdWallet = HDKey.fromExtendedKey(xpub)
        derivedKey = hdWallet.derive('m/' + index)
    } else {
        const pubKey = payload.publicKey
        const chainCode = payload.chainCode
        const hdkey = new HDKey()
        hdkey.publicKey = Buffer.from(pubKey, 'hex')
        hdkey.chainCode = Buffer.from(chainCode, 'hex')
        derivedKey = hdkey.derive('m/' + index)
    }
    let pubKey = ethUtils.bufferToHex(derivedKey.publicKey)
    const buff = ethUtils.publicToAddress(pubKey, true)

    return formatAddressByHdPath(ethUtils.bufferToHex(buff), getHdBasePath())
}

Vue.prototype.getHdBasePath = getHdBasePath
Vue.prototype.toRpcAddress = toRpcAddress
Vue.prototype.formatAddressByHdPath = formatAddressByHdPath
Vue.prototype.getVoterLinkPath = (address) => {
    return '/voter/xdc' + toRpcAddress(address).substring(2)
}
Vue.prototype.getDisplayAddress = (address) => {
    return formatAddressByHdPath(address, getHdBasePath())
}

Vue.prototype.loadTrezorWallets = async function (offset, limit) {
    try {
        const wallets = {}
        const payload = Vue.prototype.trezorPayload
        if (payload && !payload.error) {
            let convertedAddress
            let balance
            let web3
            if (!Vue.prototype.web3) {
                await Vue.prototype.detectNetwork('trezor')
            }
            web3 = Vue.prototype.web3
            for (let i = offset; i < (offset + limit); i++) {
                convertedAddress = Vue.prototype.HDWalletCreate(payload, i)
                balance = await web3.eth.getBalance(toRpcAddress(convertedAddress))
                wallets[i] = {
                    address: convertedAddress,
                    balance: parseFloat(web3.utils.fromWei(balance, 'ether')).toFixed(2)
                }
            }
            return wallets
        } else {
            throw payload.error || 'Something went wrong'
        }
    } catch (error) {
        console.log(error)
        throw error
    }
}

Vue.prototype.formatNumber = Helper.formatNumber

Vue.prototype.getCurrencySymbolByHdPath = getCurrencySymbolByHdPath

Vue.prototype.getCurrencySymbol = function () {
    const provider = Vue.prototype.NetworkProvider || localStorage.get('network')
    const hdProviders = ['ledger', 'trezor', 'custom']

    if (hdProviders.includes(provider)) {
        return getCurrencySymbolByHdPath(getHdBasePath())
    }

    return Helper.getCurrencySymbol()
}

Vue.prototype.formatCurrencySymbol = function (number) {
    return `${number} ${Vue.prototype.getCurrencySymbol()}`
}

Vue.prototype.checkLongNumber = Helper.checkLongNumber

Vue.prototype.formatBigNumber = Helper.formatBigNumber

const getConfig = Vue.prototype.appConfig = async function () {
    let config = await axios.get('/api/config')
    return config.data
}

Vue.prototype.getSecondsToHms = Helper.getSecondsToHms

Vue.prototype.serializeQuery = Helper.serializeQuery

Vue.prototype.truncate = Helper.truncate

Vue.use(VueRouter)

const router = new VueRouter({
    mode: 'history',
    routes
})

router.beforeEach(async (to, from, next) => {
    const provider = Vue.prototype.NetworkProvider || localStorage.get('network') || null
    try {
        await Vue.prototype.detectNetwork(provider)
    } catch (e) {
        console.log(formatWalletError(e))
    }
    next()
})

getConfig().then((config) => {
    if (localStorage.get('network') === 'connect-wallet' &&
        !isValidWalletConnectProjectId(resolveWalletConnectProjectId(config.blockchain))) {
        localStorage.remove('network')
    }
    // let provider = 'XDCwallet'
    // var web3js = new Web3(new Web3.providers.HttpProvider(config.blockchain.internalRpc))
    // Vue.prototype.setupProvider(provider, web3js)
    localStorage.set('configMaster', config)
    Vue.use(VueAnalytics, {
        id: config.GA,
        linkers: ['master.xinfin.network'],
        router,
        autoTraking: {
            screenView: true
        }
    })
}).catch(e => {
    console.log(formatWalletError(e))
    const cached = localStorage.get('configMaster')
    if (cached) {
        localStorage.set('configMaster', cached)
    }
})

Vue.use(Vuex)

const store = new Vuex.Store({
    state: {
        address: null
    }
})
Vue.prototype.detectNetwork = async function (provider) {
    try {
        const config = localStorage.get('configMaster') || await getConfig()
        const chainConfig = config.blockchain
        const currentProvider = Vue.prototype.NetworkProvider
        const hasLedgerWeb3 = this.web3 &&
            this.web3.currentProvider &&
            this.web3.currentProvider.isLedgerProvider
        const needsReinit = !this.web3 ||
            currentProvider !== provider ||
            (provider === 'ledger' && !hasLedgerWeb3) ||
            (provider !== 'ledger' && hasLedgerWeb3)

        if (!needsReinit && this.web3) {
            return
        }

        let wjs
        switch (provider) {
        case 'connect-wallet': {
            if (!isValidWalletConnectProjectId(resolveWalletConnectProjectId(chainConfig))) {
                localStorage.remove('network')
                break
            }
            const ewjs = await getWalletConnectProvider(false, chainConfig)
            if (ewjs.connected) {
                ewjs.on('disconnect', (code, reason) => {
                    console.log('Disconnected!')
                    localStorage.clearAll()
                    Object.assign(store.state, Helper.getDefaultState())
                    router.go({
                        path: '/'
                    })
                })

                wjs = new Web3(ewjs)
            }
            break
        }
        case 'metamask':
            // XDCPay uses window.web3; MetaMask uses window.ethereum
            if (window.ethereum) {
                wjs = new Web3(window.ethereum)
            } else if (window.web3 && window.web3.currentProvider) {
                wjs = new Web3(window.web3.currentProvider)
            }
            break
        case 'XDCwalletDapp':
            if (window.web3) {
                if (window.web3.currentProvider) {
                    wjs = new Web3(window.web3.currentProvider)
                } else {
                    wjs = window.web3
                }
            }
            break
        case 'xinpay':
            if (window.XDCWeb3) {
                if (window.XDCWeb3.currentProvider) {
                    wjs = new Web3(window.XDCWeb3.currentProvider)
                } else {
                    wjs = window.XDCWeb3
                }
            }
            break
        case 'XDCwallet':
            wjs = new Web3(new HDWalletProvider(
                '',
                chainConfig.rpc, 0, 1, true))
            break
        case 'trezor':
            wjs = new Web3(new Web3.providers.HttpProvider(chainConfig.rpc))
            break
        case 'ledger': {
            const rpcProvider = new Web3.providers.HttpProvider(chainConfig.rpc)
            const ledgerProvider = createLedgerWeb3Provider(rpcProvider, {
                getAccounts: async () => {
                    const account = await Vue.prototype.getAccount()
                    return account ? [account] : []
                },
                signPersonalMessage: (message) => Vue.prototype.signMessage(message),
                prepareTransaction: async (tx) => {
                    if (!tx.chainId) {
                        tx.chainId = chainConfig.networkId
                    }
                    if (!tx.gas && tx.gasLimit) {
                        tx.gas = tx.gasLimit
                    }
                },
                signTransaction: (tx) => Vue.prototype.signTransaction(tx),
                sendSignedTransaction: (tx, signature) =>
                    Vue.prototype.sendSignedTransaction(tx, signature)
            })
            wjs = new Web3(ledgerProvider)
            break
        }
        default:
            break
        }

        if (wjs) {
            await this.setupProvider(provider, wjs)
        }
    } catch (error) {
        console.log(error)
        throw toWalletError(error)
    }
}

/**
 * @return XDCValidator contract instance
 */
Vue.prototype.getXDCValidatorInstance = async function () {
    // workaround for web3 version 1.0.0
    // @link https://github.com/trufflesuite/truffle-contract/issues/57#issuecomment-331300494
    if (typeof Vue.prototype.XDCValidator.currentProvider.sendAsync !== 'function') {
        Vue.prototype.XDCValidator.currentProvider.sendAsync = function () {
            return Vue.prototype.XDCValidator.currentProvider.send.apply(
                Vue.prototype.XDCValidator.currentProvider,
                arguments
            )
        }
    }
    let instance = await Vue.prototype.XDCValidator.deployed()
    return instance
}

/**
 * @param object txParams
 * @return object signature {r, s, v}
 */
Vue.prototype.formatWalletError = formatWalletError

Vue.prototype.signTransaction = async function (txParams) {
    const offset = Number(localStorage.get('offset') || 0)
    const path = getLedgerPath(offset)
    const provider = Vue.prototype.NetworkProvider || localStorage.get('network')
    const normalizedTx = normalizeLedgerTxParams(txParams)
    let signature
    try {
        if (provider === 'ledger') {
            await ensureLedgerEth(path)
            const config = localStorage.get('configMaster') || await getConfig()
            const chainConfig = config.blockchain
            const unsignedTx = prepareUnsignedLedgerTx(Object.assign(
                pickLedgerTxFields(normalizedTx),
                { chainId: normalizedTx.chainId || chainConfig.networkId }
            ))
            const serializedRawTx = unsignedTx.serialize().toString('hex')
            signature = await signLedgerTransaction(
                Vue.prototype.appEth,
                path,
                serializedRawTx
            )
        }
        if (provider === 'trezor') {
            const result = await TrezorConnect.ethereumSignTransaction({
                path,
                transaction: normalizedTx
            })
            if (!result.success) {
                throw new Error(
                    (result.payload && result.payload.error) || 'Trezor signing failed'
                )
            }
            signature = result.payload
        }
    } catch (error) {
        console.log(error)
        throw formatLedgerError(error, path)
    }
    return signature
}

/**
 * @param object txParams
 * @param object signature {r,s,v}
 * @return transactionReceipt
 */
Vue.prototype.sendSignedTransaction = function (txParams, signature) {
    return new Promise((resolve, reject) => {
        try {
            const normalizedTx = normalizeLedgerTxParams(txParams)
            const sig = formatLedgerSignature(signature)
            const config = localStorage.get('configMaster')
            const chainId = normalizedTx.chainId ||
                (config && config.blockchain && config.blockchain.networkId)
            const tx = new Transaction(Object.assign(
                pickLedgerTxFields(normalizedTx),
                chainId ? { chainId } : {},
                sig
            ))

            if (!tx.verifySignature()) {
                return reject(new Error(
                    'Invalid transaction signature. Reconnect Ledger and try again.'
                ))
            }

            const expectedFrom = ethUtils.toBuffer(normalizedTx.from)
            const sender = tx.getSenderAddress()
            if (!sender.equals(expectedFrom)) {
                return reject(new Error(
                    'Transaction signer does not match your wallet. Check Settings and try again.'
                ))
            }

            const serializedTx = serializeSignedTxForRpc(tx)
            Vue.prototype.web3.eth.sendSignedTransaction(serializedTx)
                .on('transactionHash', (txHash) => resolve(txHash))
                .on('error', (error) => reject(toWalletError(error)))
                .catch((error) => reject(toWalletError(error)))
        } catch (error) {
            reject(toWalletError(error))
        }
    })
}

const getReceiptWeb3 = () => {
    const config = localStorage.get('configMaster')
    const rpcUrl = config && config.blockchain && config.blockchain.rpc
    if (!rpcUrl) {
        return Vue.prototype.web3
    }
    return new Web3(new Web3.providers.HttpProvider(rpcUrl))
}

const validateTransactionReceipt = (receipt) => {
    if (!receipt) {
        throw new Error('No transaction receipt received from wallet.')
    }
    const status = receipt.status
    if (status === false || status === '0x0' || Number(status) === 0) {
        throw new Error('Transaction failed on chain.')
    }
    return receipt
}

Vue.prototype.waitForTransactionReceipt = async function (txHash, timeoutMs = 120000) {
    const rpcHash = normalizeTxHash(txHash)
    const xdcHash = rpcHash && rpcHash.startsWith('0x') ? 'xdc' + rpcHash.substring(2) : null
    const hashesToTry = [...new Set([rpcHash, xdcHash, txHash].filter(Boolean))]
    const readWeb3 = getReceiptWeb3()
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
        for (let i = 0; i < hashesToTry.length; i++) {
            try {
                const receipt = await readWeb3.eth.getTransactionReceipt(hashesToTry[i])
                if (receipt) {
                    return validateTransactionReceipt(receipt)
                }
            } catch (pollError) {
                console.log(pollError)
            }
        }
        await delay(2000)
    }
    throw new Error('Transaction timed out waiting for confirmation.')
}

/**
 * Wait for wallet .send() to finish. XDCPay often does not expose getTransactionReceipt on the
 * injected provider — poll the public RPC instead once we have a tx hash or receipt.
 */
Vue.prototype.sendContractTransaction = function (contractMethod, txParams, timeoutMs = 180000) {
    return new Promise((resolve, reject) => {
        let settled = false
        const complete = (receipt) => {
            if (settled) {
                return
            }
            settled = true
            clearTimeout(timer)
            try {
                resolve(validateTransactionReceipt(receipt))
            } catch (error) {
                reject(toWalletError(error))
            }
        }
        const fail = (error) => {
            if (settled) {
                return
            }
            settled = true
            clearTimeout(timer)
            reject(toWalletError(error))
        }

        const timer = setTimeout(() => {
            fail(new Error('Transaction timed out waiting for wallet confirmation.'))
        }, timeoutMs)

        const promi = contractMethod.send(txParams)

        promi.once('error', fail)
        promi.once('receipt', complete)

        promi.on('confirmation', (confirmationNumber, receipt) => {
            if (receipt && (receipt.transactionHash || receipt.blockNumber !== undefined)) {
                complete(receipt)
            }
        })

        promi.once('transactionHash', (txHash) => {
            Vue.prototype.waitForTransactionReceipt(txHash, timeoutMs)
                .then(complete)
                .catch(fail)
        })

        if (typeof promi.then === 'function') {
            promi.then((result) => {
                if (!result) {
                    return
                }
                if (typeof result === 'string') {
                    return Vue.prototype.waitForTransactionReceipt(result, timeoutMs)
                        .then(complete)
                        .catch(fail)
                }
                if (result.transactionHash || result.blockNumber !== undefined || result.blockHash) {
                    complete(result)
                    return
                }
                if (result.hash) {
                    return Vue.prototype.waitForTransactionReceipt(result.hash, timeoutMs)
                        .then(complete)
                        .catch(fail)
                }
            }).catch(fail)
        }
    })
}

Vue.prototype.sendHardwareWalletTransaction = async function (contractMethod, txParams) {
    const config = localStorage.get('configMaster') || await getConfig()
    const chainConfig = config.blockchain
    const account = await Vue.prototype.getAccount()
    if (!account) {
        throw new Error('No wallet account found. Please log in again.')
    }
    const fromRpc = toRpcAddress(account)
    const nonce = await Vue.prototype.web3.eth.getTransactionCount(fromRpc)
    const data = await contractMethod.encodeABI()
    const dataTx = Object.assign({
        from: fromRpc,
        to: toRpcAddress(chainConfig.validatorAddress),
        data,
        value: '0x0',
        nonce: Vue.prototype.web3.utils.toHex(nonce),
        chainId: chainConfig.networkId
    }, txParams)

    const signature = await Vue.prototype.signTransaction(dataTx)
    const txHash = await Vue.prototype.sendSignedTransaction(dataTx, signature)
    await Vue.prototype.waitForTransactionReceipt(txHash)
    return txHash
}

Vue.prototype.signMessage = async function (message) {
    try {
        const offset = Number(localStorage.get('offset') || 0)
        const path = getLedgerPath(offset)
        const provider = Vue.prototype.NetworkProvider || localStorage.get('network')
        let result
        switch (provider) {
        case 'ledger':
            await ensureLedgerEth(path)
            const signature = await Vue.prototype.appEth.signPersonalMessage(
                path,
                Buffer.from(message).toString('hex')
            )
            const r = toHexBuffer(signature.r)
            const s = toHexBuffer(signature.s)
            let v = signature.v
            if (typeof v === 'string') {
                v = parseInt(v, 16)
            }
            if (v < 27) {
                v += 27
            }
            result = ethUtils.toRpcSig(v, r, s)
            break
        case 'trezor':
            const sig = await TrezorConnect.ethereumSignMessage({
                path,
                message
            })
            result = '0x' + sig.payload.signature || ''
            break
        default:
            break
        }
        return result
    } catch (error) {
        console.log(error)
        throw error
    }
}

const EventBus = new Vue()

Vue.prototype.$bus = EventBus

if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
        if (isWalletConnectUserCancelError(event.reason)) {
            event.preventDefault()
            return
        }
        console.error('Unhandled promise rejection:', event.reason)
        event.preventDefault()
    })
}

Vue.config.errorHandler = (err, vm, info) => {
    console.error('Vue error:', formatWalletError(err), info)
}

new Vue({ // eslint-disable-line no-new
    el: '#app',
    store,
    router: router,
    components: { App },
    template: '<App/>'
})
