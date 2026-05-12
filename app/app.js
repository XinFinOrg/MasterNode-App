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

const LEDGER_APP_NAME = 'Ethereum'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const createLedgerEth = async () => {
    let transport = await TransportWebUSB.create()

    const currentApp = await getAppAndVersion(transport)
    const openedApp = currentApp.name

    if (openedApp !== 'BOLOS' && openedApp !== LEDGER_APP_NAME) {
        await attemptToQuitApp(transport, openedApp)
        await delay(8000)
        transport = await TransportWebUSB.create()
    }

    if (openedApp !== LEDGER_APP_NAME) {
        await openApp(transport, LEDGER_APP_NAME)
        await delay(2500)
        transport = await TransportWebUSB.create()
    }

    return new Eth(transport)
}

const getLedgerPath = (index = null) => {
    const config = localStorage.get('configMaster')
    const networkId = Number(config.blockchain.networkId)

    let basePath

    if (networkId === 50) {
        basePath = `m/44'/550'/0'/0`
    } else if (networkId === 51) {
        basePath = `m/44'/551'/0'/0`
    } else {
        basePath = `m/44'/60'/0'/0`
    }

    return index === null ? basePath : `${basePath}/${index}`
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

const ethereumProvider = async (showQrModal, blockchain) => {
    const walletConnectProvider = await EthereumProvider.init({
        projectId: blockchain.walletconnectProjectId,
        showQrModal: showQrModal,
        qrModalOptions: { themeMode: 'light' },
        chains: [50],
        optionalChains:[1, 51],
        methods: ['eth_sendTransaction', 'personal_sign'],
        rpcMap:{
            [blockchain.networkId]:blockchain.rpc,
            51 :'https://rpc.apothem.network/'
        },
        metadata: {
            name: 'XDC Network Governance Dapp',
            description: 'Providing a professional UI which allows coin-holders to stake for masternodes, decentralized governance and explore masternode performance statistics',
            url: 'https://master.xinfin.network/',
            icons: ['https://master.xinfin.network/app/assets/img/logo.svg']
        }
    })
    return walletConnectProvider
}
// wallet-connect global provider
Vue.prototype.walletConnectProvider = async (projectId) => {
    return ethereumProvider(true, projectId)
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
            if (!Vue.prototype.appEth) {
                Vue.prototype.appEth = await createLedgerEth()
            }
            let ethAppConfig = await Vue.prototype.appEth.getAppConfiguration()
            if (!ethAppConfig.arbitraryDataEnabled) {
                throw new Error(`Please go to App Setting
                    to enable contract data and display data on your device!`)
            }
            const path = getLedgerPath(0)

            let result = await Vue.prototype.appEth.getAddress(path)
            account = result.address
        } catch (error) {
            console.log(error)
            throw error
        }
        break
    case 'trezor':
        const payload = Vue.prototype.trezorPayload || localStorage.get('trezorPayload')
        const offset = localStorage.get('offset')
        account = Vue.prototype.HDWalletCreate(
            payload,
            offset
        )
        localStorage.set('trezorPayload', { xpub: payload.xpub })
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
    // let u2fSupported = await Transport.isSupported()
    let u2fSupported = await TransportWebUSB.isSupported()
    if (!u2fSupported) {
        throw new Error(`WebUSB not supported in this browser. Please use Google Chrome with HTTPS.`)
    }
    await Vue.prototype.detectNetwork('ledger')
    if (!Vue.prototype.appEth) {
        Vue.prototype.appEth = await createLedgerEth()
    }
    const payload = Vue.prototype.ledgerPayload
    let web3 = Vue.prototype.web3
    let balance = 0
    let convertedAddress
    let wallets = {}

    for (let i = offset; i < (offset + limit); i++) {
        convertedAddress = Vue.prototype.HDWalletCreate(payload, i)
        balance = await web3.eth.getBalance(convertedAddress)
        wallets[i] = {
            address: convertedAddress,
            balance: parseFloat(web3.utils.fromWei(balance, 'ether')).toFixed(2)
        }
    }
    Vue.prototype.ledgerPayload = ''
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
        if (!Vue.prototype.appEth) {
            // let transport = await Transport.create()
            Vue.prototype.appEth = await createLedgerEth()
        }
        const path = getLedgerPath()

        const result = await Vue.prototype.appEth.getAddress(
            path,
            false,
            true
        )
        Vue.prototype.ledgerPayload = result
    } catch (error) {
        console.log(error)
        throw error
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
        let wjs = this.web3
        const ewjs = await ethereumProvider(false, config.blockchain)
        const chainConfig = config.blockchain
        if (!wjs) {
            switch (provider) {
            case 'connect-wallet':
                if (ewjs.connected) {
                    ewjs.on('disconnect', (code, reason) => {
                        console.log('Disconnected!')
                        localStorage.clearAll()
                        Object.assign(store.state, Helper.getDefaultState())
                        router.go({
                            path: '/'
                        })
                    })

                    let p = ewjs
                    wjs = new Web3(p)
                }
                break
            case 'metamask':
                if (window.ethereum) {
                    let p = window.ethereum
                    wjs = new Web3(p)
                }
                break
            case 'XDCwalletDapp':
                if (window.web3) {
                    if (window.web3.currentProvider) {
                        let p = window.web3.currentProvider
                        wjs = new Web3(p)
                    } else {
                        wjs = window.web3
                    }
                }
                break
            case 'xinpay':
                if (window.XDCWeb3) {
                    if (window.XDCWeb3.currentProvider) {
                        let pp = window.XDCWeb3.currentProvider
                        wjs = new Web3(pp)
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
                // wjs = new Web3(new Web3.providers.WebsocketProvider(chainConfig.ws))
                wjs = new Web3(new Web3.providers.HttpProvider(chainConfig.rpc))
                break
            default:
                break
            }
            await this.setupProvider(provider, await wjs)
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
