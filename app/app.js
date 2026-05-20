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
// import XDCValidatorArtifacts from '../build/contracts/XDCValidator.json'
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

const getLedgerPath = (index = null) => {
    let basePath = localStorage.get('ledgerDevicePath') ||
        localStorage.get('hdDerivationPath') ||
        getDefaultLedgerBasePath()

    if (index !== null && index !== undefined) {
        basePath = basePath.replace(/\/\d+$/, '')
        return `${basePath}/${index}`
    }

    // Saved wallet paths include a trailing address index (e.g. .../0/3).
    if (basePath.split('/').length > 5 && /\/\d+$/.test(basePath)) {
        basePath = basePath.replace(/\/\d+$/, '')
    }

    return basePath
}

const formatLedgerError = (error, path) => {
    const displayPath = normalizeLedgerPath(path)

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
    return error
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

    walletConnectInitPromise = EthereumProvider.init({
        projectId: blockchain.walletconnectProjectId,
        showQrModal: showQrModal,
        qrModalOptions: { themeMode: 'light' },
        chains: [50],
        optionalChains: [1, 50, 51],
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
    })

    return walletConnectInitPromise
}

// wallet-connect global provider
Vue.prototype.walletConnectProvider = async (projectId) => {
    return getWalletConnectProvider(true, projectId)
}

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
        // Request account access if needed - for metamask
        if (window.ethereum) {
            await window.ethereum.enable()
            // await window.ethereum.request({ method: 'eth_requestAccounts' })
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
                let ethAppConfig = await Vue.prototype.appEth.getAppConfiguration()
                if (!ethAppConfig.arbitraryDataEnabled) {
                    throw new Error(`Please go to App Setting
                    to enable contract data and display data on your device!`)
                }
                const result = await ledgerGetAddress(Vue.prototype.appEth, path)
                account = result.address
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
    await Vue.prototype.detectNetwork('ledger')

    const payload = Vue.prototype.ledgerPayload
    if (!payload || !payload.publicKey) {
        throw new Error('Ledger not unlocked. Please connect your device and try again.')
    }

    const web3 = Vue.prototype.web3
    if (!web3) {
        throw new Error('Network not ready. Please try again.')
    }

    const wallets = {}

    for (let i = offset; i < (offset + limit); i++) {
        try {
            const convertedAddress = Vue.prototype.HDWalletCreate(payload, i)
            let balance = '0.00'
            try {
                const balanceWei = await web3.eth.getBalance(convertedAddress)
                balance = parseFloat(web3.utils.fromWei(balanceWei, 'ether')).toFixed(2)
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
    try {
        const userPath = localStorage.get('hdDerivationPath') || getDefaultLedgerBasePath()
        await ensureLedgerEth(userPath)

        const result = await ledgerGetAddress(Vue.prototype.appEth, userPath)
        Vue.prototype.ledgerPayload = result
    } catch (error) {
        console.log(error)
        throw formatLedgerError(error, getLedgerPath())
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

    return ethUtils.bufferToHex(buff)
}

Vue.prototype.loadTrezorWallets = async (offset, limit) => {
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
                balance = await web3.eth.getBalance(convertedAddress)
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

Vue.prototype.formatCurrencySymbol = Helper.formatCurrencySymbol

Vue.prototype.getCurrencySymbol = Helper.getCurrencySymbol

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
    await Vue.prototype.detectNetwork(provider)
    next()
})

getConfig().then((config) => {
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
    console.log(e)
    throw e
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
        const hardwareProviders = ['ledger', 'trezor', 'XDCwallet', 'custom']
        const needsReinit = !this.web3 ||
            (hardwareProviders.includes(provider) && Vue.prototype.NetworkProvider !== provider)

        if (!needsReinit && this.web3) {
            return
        }

        let wjs
        switch (provider) {
        case 'connect-wallet': {
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
            if (window.ethereum) {
                wjs = new Web3(window.ethereum)
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
        case 'ledger':
            wjs = new Web3(new Web3.providers.HttpProvider(chainConfig.rpc))
            break
        default:
            break
        }

        if (wjs) {
            await this.setupProvider(provider, wjs)
        }
    } catch (error) {
        console.log(error)
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
Vue.prototype.signTransaction = async function (txParams) {
    const offset = Number(localStorage.get('offset') || 0)
    const path = getLedgerPath(offset)
    const provider = Vue.prototype.NetworkProvider
    let signature
    if (provider === 'ledger') {
        await ensureLedgerEth(path)
        const config = localStorage.get('configMaster') || await getConfig()
        const chainConfig = config.blockchain
        const rawTx = new Transaction(txParams)
        rawTx.v = Buffer.from([chainConfig.networkId])
        const serializedRawTx = rawTx.serialize().toString('hex')
        signature = await Vue.prototype.appEth.signTransaction(
            path,
            serializedRawTx
        )
    }
    if (provider === 'trezor') {
        try {
            const result = await TrezorConnect.ethereumSignTransaction({
                path,
                transaction: txParams
            })
            signature = result.payload
        } catch (error) {
            console.log(error)
            throw error
        }
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
            // "hexify" the keys
            Object.keys(signature).map((key, _) => {
                if (signature[key].startsWith('0x')) {
                    return signature[key]
                } else signature[key] = '0x' + signature[key]
            })
            let txObj = Object.assign({}, txParams, signature)
            let tx = new Transaction(txObj)
            let serializedTx = '0x' + tx.serialize().toString('hex')
            // web3 v0.2, method name is sendRawTransaction
            // You are using web3 v1.0. The method was renamed to sendSignedTransaction.
            Vue.prototype.web3.eth.sendSignedTransaction(
                serializedTx
            ).on('transactionHash', txHash => resolve(txHash))
                .catch(error => reject(error))
        } catch (error) {
            reject(error)
        }
    })
}

Vue.prototype.signMessage = async function (message) {
    try {
        const offset = Number(localStorage.get('offset') || 0)
        const path = getLedgerPath(offset)
        const provider = Vue.prototype.NetworkProvider
        let result
        switch (provider) {
        case 'ledger':
            await ensureLedgerEth(path)
            const signature = await Vue.prototype.appEth.signPersonalMessage(
                path,
                Buffer.from(message).toString('hex')
            )
            let v = signature['v'] - 27
            v = v.toString(16)
            if (v.length < 2) {
                v = '0' + v
            }
            result = '0x' + signature['r'] + signature['s'] + v
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

new Vue({ // eslint-disable-line no-new
    el: '#app',
    store,
    router: router,
    components: { App },
    template: '<App/>'
})
