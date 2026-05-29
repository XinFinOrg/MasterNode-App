<template>
    <div>
        <div
            v-if="address"
            class="XDC-header">
            <div class="container">
                <div class="XDC-header-block">
                    <div class="XDC-header-block-left">
                        <div>
                            <i class="tm-wallet XDC-header__icon" />
                        </div>
                        <div>
                            <h4 class="h4 color-black">Address</h4>
                            <p>
                                <router-link
                                    :to="getVoterLinkPath(address)"
                                    class="text-truncate">
                                    {{ getDisplayAddress(address) }}
                                </router-link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="main-content container">
            <div
                v-if="!address">
                <b-row
                    class="m-0">
                    <div class="col-12 col-md-2 col-lg-2"/>
                    <b-card
                        v-if="!address"
                        :class="'col-12 col-md-8 col-lg-8 XDC-card XDC-card--lighter'
                        + (loading ? ' XDC-loading' : '')">
                        <h4 class="color-white XDC-card__title XDC-card__title--big">Login</h4>
                        <b-form
                            class="XDC-form XDC-form--setting"
                            novalidate
                            @submit.prevent="validate()">
                            <b-form-group
                                class="mb-4"
                                label="Network Provider"
                                label-for="provider">
                                <b-input-group>
                                    <b-form-select
                                        id="provider"
                                        v-model="provider"
                                        class="form-control"
                                        @change="onChangeSelect">
                                        <option
                                            v-if="!isElectron"
                                            value="metamask">XDCPay</option>
                                        <option value="connect-wallet">WalletConnect v2</option>
                                        <!-- <option
                                            value="XDCwallet">XDCWallet (Recommended)</option> -->
                                        <option
                                            value="custom">PrivateKey/MNEMONIC</option>
                                        <option
                                            value="ledger">Ledger Wallet</option>
                                        <option
                                            value="trezor">Trezor Wallet</option>
                                            <!-- <option
                                                v-if="!isElectron"
                                                value="xinpay">XinPay</option> -->
                                    </b-form-select>
                                    <small
                                        v-if="provider !== 'metamask' && provider !== 'xinpay'"
                                        class="form-text text-muted">Using node at {{ chainConfig.rpc }}.</small>
                                </b-input-group>
                            </b-form-group>
                            <!-- <b-form-group
                                v-if="provider === 'custom'"
                                class="mb-4"
                                label="Network URL"
                                label-for="networks-custom">
                                <b-form-input
                                    :class="getValidationClass('custom')"
                                    v-model="networks.custom"
                                    type="text" />
                                <span
                                    v-if="$v.networks.custom.$dirty && !$v.networks.custom.required"
                                    class="text-danger">Required field</span>
                                <span
                                    v-else-if="$v.networks.custom.$dirty && !$v.networks.custom.localhostUrl"
                                    class="text-danger">Wrong URL format</span>
                            </b-form-group> -->
                            <b-form-group
                                v-if="provider === 'custom'"
                                class="mb-4"
                                label="Privatekey/MNEMONIC"
                                label-for="mnemonic">
                                <b-form-input
                                    :class="getValidationClass('mnemonic')"
                                    v-model="mnemonic"
                                    autocomplete="off"
                                    type="text" />
                                <span
                                    v-if="$v.mnemonic.$dirty && !$v.mnemonic.required"
                                    class="text-danger">Required field</span>
                            </b-form-group>
                            <b-form-group
                                v-if="provider === 'custom'"
                                class="mb-4"
                                label="Select HD derivation path(MNEMONIC)"
                                label-for="hdPath">
                                <b-form-input
                                    :class="getValidationClass('hdPath')"
                                    :value="hdPath"
                                    v-model="hdPath"
                                    type="text" />
                                <span
                                    v-if="$v.hdPath.$dirty && !$v.hdPath.required"
                                    class="text-danger">Required field</span>
                                <small
                                    class="form-text text-muted">To unlock the wallet, try paths
                                    <code
                                        class="hd-path"
                                        @click="changePath(`m/44'/60'/0'/0`)">m/44'/60'/0'/0</code> or
                                    <code
                                        class="hd-path"
                                        @click="changePath(`m/44'/60'/0'`)">m/44'/60'/0'</code> or
                                    <code
                                        class="hd-path"
                                        @click="changePath(`m/44'/550'/0'/0`)">m/44'/550'/0'/0</code> or
                                    <code
                                        class="hd-path"
                                        @click="changePath(`m/44'/551'/0'/0`)">m/44'/551'/0'/0</code></small>
                            </b-form-group>

                            <b-form-group
                                v-if="provider === 'XDCwallet'"
                                class="mb-4"
                                style="text-align: center">
                                <vue-qrcode
                                    :options="{size: 250 }"
                                    :value="qrCode"
                                    class="img-fluid text-center text-lg-right"/>
                                <div
                                    v-if="mobileCheck">
                                    <b-button
                                        :href="qrCodeApp"
                                        variant="primary">
                                        Open in App
                                    </b-button>
                                </div>
                                <div>
                                    <b>In case you do not have XDCWallet, download here</b>
                                </div>
                                <div
                                    style="margin-top: 5px">
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        href="https://goo.gl/MvE1GV"
                                        class="social-links__link">
                                        <img src="/app/assets/img/appstore.png" >
                                    </a>
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        href="https://goo.gl/4tFQzY"
                                        class="social-links__link">
                                        <img src="/app/assets/img/googleplay.png" >
                                    </a>
                                </div>
                            </b-form-group>
                            <b-form-group
                                v-if="provider === 'ledger'"
                                class="mb-4"
                                label="Select HD derivation path"
                                label-for="hdPath">
                                <b-form-input
                                    :class="getValidationClass('hdPath')"
                                    :value="hdPath"
                                    v-model="hdPath"
                                    type="text" />
                                <span
                                    v-if="$v.hdPath.$dirty && !$v.hdPath.required"
                                    class="text-danger">Required field</span>
                                <small
                                    class="form-text text-muted">To unlock the wallet, try paths
                                    <code
                                        class="hd-path"
                                        @click="changePath(`m/44'/60'/0'`)">m/44'/60'/0'</code>
                                    or <code
                                        class="hd-path"
                                        @click="changePath(`m/44'/60'/0'/0`)">m/44'/60'/0'/0</code>
                                    with Ethereum App,<br>
                                    or try path <code
                                        class="hd-path"
                                        @click="changePath(`m/44'/550'/0'/0`)">m/44'/550'/0'/0</code>
                                    <!-- or <code
                                        class="hd-path"
                                        @click="changePath(`m/44'/551'/0'/0`)">m/44'/551'/0'/0</code> -->
                                    with XDC Network App (on Ledger).</small>
                            </b-form-group>

                            <b-form-group
                                v-if="provider === 'trezor'"
                                class="mb-4"
                                label-for="hdPath">
                                <span>HD derivation path: </span>
                                <label class="ml-1"><b>m/44'/60'/0'/0</b></label>
                                <!-- <b-form-input
                                    :class="getValidationClass('hdPath')"
                                    :value="hdPath"
                                    v-model="hdPath"
                                    readonly
                                    type="text" /> -->
                                <!-- <span
                                    v-if="$v.hdPath.$dirty && !$v.hdPath.required"
                                    class="text-danger">Required field</span> -->
                            </b-form-group>

                            <div
                                v-if="!isReady && provider === 'metamask'">
                                <p>Please install &amp; login
                                    <a
                                        href="https://chrome.google.com/webstore/detail/xdcpay/bocpokimicclpaiekenaeelehdjllofo/"
                                        target="_blank"
                                        rel="noopener noreferrer">XDCPay Extension</a>
                                    then connect it to XDC Network Mainnet or Apothem Testnet.</p>
                            </div>
                            <div
                                v-if="!isReady && provider === 'xinpay'">
                                <p>Please install &amp; login
                                    <a
                                        href="https://xinpay.io/"
                                        target="_blank"
                                        rel="noopener noreferrer">XinPay Extension</a>
                                    then connect it to XDC Network Mainnet or Testnet.</p>
                            </div>
                            <div class="buttons text-right">
                                <b-button
                                    v-if="provider !== 'XDCwallet'"
                                    type="submit"
                                    variant="primary">
                                    {{ (provider === 'ledger' || provider === 'trezor') ? 'Connect wallet' : 'Save' }}
                                </b-button>
                            </div>
                        </b-form>
                    </b-card>
                    <div class="col-12 col-md-2 col-lg-2"/>
                </b-row>
            </div>
            <div
                v-if="address">
                <b-row
                    class="m-0">
                    <div
                        class="col-12 col-md-6 col-lg-6">
                        <b-card
                            v-if="address"
                            :class="'XDC-card XDC-card--lighter'
                            + (loading ? ' XDC-loading' : '')">
                            <h4 class="h4 XDC-card__title color-black">
                                Account Information</h4>
                            <ul class="XDC-list list-unstyled">
                                <li class="XDC-list__item">
                                    <i class="tm-wallet XDC-list__icon" />
                                    <p class="XDC-list__text">
                                        <router-link
                                            :to="getVoterLinkPath(address)"
                                            class="text-truncate">
                                            {{ getDisplayAddress(address) }}
                                        </router-link>
                                        <span>Address</span>
                                    </p>
                                </li>
                                <li class="XDC-list__item">
                                    <i class="tm-XDC2 XDC-list__icon" />
                                    <div class="XDC-list__text">
                                        <p class="color-white mb-0">{{ formatNumber(balance) }}
                                        <span class="text-muted">{{ getCurrencySymbol() }}</span></p>
                                        <span>Balance</span>
                                    </div>
                                </li>
                                <li class="XDC-list__item">
                                    <i class="tm-XDC XDC-list__icon" />
                                    <div class="XDC-list__text">
                                        <p class="color-white mb-0">
                                        <span class="text-muted">{{ Boolean(KYCStatus) }}</span></p>
                                        <span>KYC</span>
                                    </div>
                                </li>
                                <li
                                    v-if="KYCStatus"
                                    class="XDC-list__item">
                                    <i class="tm-XDC XDC-list__icon" />
                                    <div class="XDC-list__text">
                                        <p class="color-white mb-0">
                                            <span class="text-muted">
                                                <a
                                                    :href="`https://kycdocs.xinfin.network/${KYCStatus}`"
                                                    target="_blank"
                                                    rel="noopener noreferrer">
                                                    Check here
                                                </a>
                                            </span>
                                        </p>
                                        <span>KYC</span>
                                    </div>
                                </li>
                            </ul>
                        </b-card>
                    </div>
                    <div
                        class="col-12 col-md-6 col-lg-6">
                        <b-card
                            v-if="isReady && (aw || (wh.length > 0))"
                            :class="'XDC-card XDC-card--lighter'
                            + (loading ? ' XDC-loading' : '')">
                            <h4 class="h4 XDC-card__title color-black">
                                Withdrawals</h4>
                            <ul
                                v-for="(w, k, index) in withdraws"
                                :key="index"
                                class="XDC-list list-unstyled">
                                <li
                                    v-if="w.blockNumber !== '0' && w.cap !== '0'"
                                    class="XDC-list__item">
                                    <p class="XDC-list__text">
                                        <a :href="`${config.explorerUrl}/blocks/${w.blockNumber}`">
                                            {{ w.blockNumber }}</a>
                                        <span>Withdrawal Block Number</span>
                                    </p>
                                    <!-- <div class="XDC-list__text">
                                        <p class="color-white mb-0">
                                            {{ w.estimatedTime }}</p>
                                        <span>Estimated Time</span>
                                    </div> -->
                                    <div class="XDC-list__text">
                                        <p class="color-white mb-0">{{ w.cap }}
                                        <span class="text-muted">{{ getCurrencySymbol() }}</span></p>
                                        <span>Capacity</span>
                                    </div>
                                    <!-- <b-button
                                        :disabled="w.blockNumber > chainConfig.blockNumber"
                                        variant="primary"
                                        @click="withdraw(w.blockNumber, k)">Withdraw</b-button> -->
                                    <div class="XDC-list__text">
                                        <b-button
                                            :disabled="w.blockNumber > chainConfig.blockNumber"
                                            class="float-right"
                                            variant="primary"
                                            @click="changeView(w, k)">Withdraw</b-button>
                                    </div>
                                </li>
                            </ul>
                            <ul
                                v-for="(w, k, index) in wh"
                                :key="index"
                                class="XDC-list list-unstyled">
                                <li
                                    class="XDC-list__item">
                                    <p class="XDC-list__text">
                                        <a :href="`${config.explorerUrl}/txs/${w.tx}`">
                                            {{ (w.tx || '').substring(0,8) }}</a>
                                        <span>Transaction</span>
                                    </p>
                                    <div class="XDC-list__text">
                                        <p class="color-white mb-0">{{ w.cap }}
                                        <span class="text-muted">{{ getCurrencySymbol() }}</span></p>
                                        <span>Capacity</span>
                                    </div>
                                    <p class="XDC-list__text"/>
                                </li>
                            </ul>
                        </b-card>
                    </div>
                </b-row>
            </div>
            <div
                v-show="showHdWalletModal"
                id="hdwalletModal"
                class="XDC-hd-wallet-modal"
                @click.self="closeModal">
                <div class="XDC-hd-wallet-modal__dialog">
                    <header class="XDC-hd-wallet-modal__header">
                        <div>
                            <h4 class="XDC-hd-wallet-modal__title">Select wallet</h4>
                            <p class="XDC-hd-wallet-modal__subtitle">
                                Please select the address you would like to interact with
                            </p>
                        </div>
                        <button
                            type="button"
                            class="XDC-hd-wallet-modal__close"
                            aria-label="Close"
                            @click="closeModal" />
                    </header>

                    <section class="XDC-hd-wallet-modal__body">
                        <ul class="XDC-hd-wallet-modal__list list-unstyled">
                            <li
                                v-for="(hdwallet, index) in hdWallets"
                                :key="index"
                                :class="[
                                    'XDC-hd-wallet-modal__item',
                                    { 'XDC-hd-wallet-modal__item--active': selectedHdWalletIndex === String(index) }
                                ]"
                                @click="selectedHdWalletIndex = String(index)">
                                <label class="XDC-hd-wallet-modal__label">
                                    <input
                                        v-model="selectedHdWalletIndex"
                                        :value="String(index)"
                                        name="hdWallet"
                                        type="radio"
                                        class="XDC-hd-wallet-modal__radio"
                                        autocomplete="off">
                                    <span class="XDC-hd-wallet-modal__radio-ui" />
                                    <span class="XDC-hd-wallet-modal__details">
                                        <span class="XDC-hd-wallet-modal__address">
                                            {{ formatWalletAddress(hdwallet.address) }}
                                        </span>
                                        <span class="XDC-hd-wallet-modal__balance-label">Balance</span>
                                    </span>
                                    <span class="XDC-hd-wallet-modal__balance">
                                        {{ hdwallet.balance }}
                                        <span class="XDC-hd-wallet-modal__symbol">
                                            {{ getCurrencySymbolByHdPath(hdPath) }}
                                        </span>
                                    </span>
                                </label>
                            </li>
                        </ul>

                        <button
                            :disabled="loadingMoreHdAddresses"
                            type="button"
                            class="XDC-hd-wallet-modal__more"
                            @click="moreHdAddresses">
                            <span v-if="loadingMoreHdAddresses">Loading addresses...</span>
                            <span v-else>Load more addresses</span>
                        </button>
                    </section>

                    <footer class="XDC-hd-wallet-modal__footer">
                        <b-button
                            variant="outline-secondary"
                            @click="closeModal">
                            Cancel
                        </b-button>
                        <b-button
                            variant="primary"
                            @click="setHdPath">
                            Unlock wallet
                        </b-button>
                    </footer>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import Web3 from 'xdc3'
import BigNumber from 'bignumber.js'
import { validationMixin } from 'vuelidate'
import axios from 'axios'
import {
    required, minLength
} from 'vuelidate/lib/validators'
// import localhostUrl from '../../validators/localhostUrl.js'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import store from 'store'
import Helper from '../utils'
// const HDWalletProvider = require('truffle-hdwallet-provider')
const { HDWalletProvider } = require('../../helpers')
const PrivateKeyProvider = require('truffle-privatekey-provider')
const defaultWalletNumber = 10
export default {
    name: 'App',
    components: {
        VueQrcode
    },
    mixins: [validationMixin],
    data () {
        return {
            isReady: !!this.web3,
            mnemonic: '',
            hdPath: "m/44'/550'/0'/0", // HD DerivationPath of hardware wallet
            hdWallets: {}, // list of addresses in hardware wallet
            showHdWalletModal: false,
            selectedHdWalletIndex: '0',
            loadingMoreHdAddresses: false,
            config: {},
            provider: 'metamask',
            address: '',
            withdraws: [],
            wh: [],
            aw: false,
            balance: 0,
            chainConfig: {},
            networks: {
                // mainnet: 'https://core.xinfin.network',
                rpc: 'https://testnet.xinfin.network',
                XDCwallet: 'https://testnet.xinfin.network'
            },
            loading: false,
            qrCode: 'text',
            id: '',
            interval: '',
            qrCodeApp: '',
            gasPrice: null,
            KYCStatus: false
        }
    },
    validations: {
        networks: {
            // custom: {
            //     required,
            //     localhostUrl
            // }
        },
        mnemonic: {
            required
        },
        hdPath: {
            required,
            minLength: minLength(12)
        }
    },
    computed: {
        mobileCheck: () => {
            const isAndroid = navigator.userAgent.match(/Android/i)
            const isIOS = navigator.userAgent.match(/iPhone|iPad|iPod/i)
            return (isAndroid || isIOS)
        }
    },
    watch: {},
    updated () {},
    beforeDestroy () {
        if (this.interval) {
            clearInterval(this.interval)
        }
    },
    created: async function () {
        if (this.NetworkProvider) {
            this.provider = this.NetworkProvider
        }
        let self = this
        self.hdWallets = self.hdWallets || {}
        self.config = store.get('configMaster') || await self.appConfig()
        self.chainConfig = self.config.blockchain || {}
        self.networks.rpc = self.chainConfig.rpc

        self.setupAccount = async () => {
            let contract
            let account
            self.address = ''
            try {
                if (!self.web3 && self.NetworkProvider === 'metamask') {
                    throw Error('Web3 is not properly detected. Have you installed MetaMask extension?')
                }
                if (!self.web3 && self.NetworkProvider === 'xinpay') {
                    throw Error('Web3 is not properly detected. Have you installed XinPay extension?')
                }
                if (self.web3) {
                    try {
                        contract = self.XDCValidator
                        self.gasPrice = await self.web3.eth.getGasPrice()
                    } catch (error) {
                        self.$toasted.show('Make sure you choose correct XDC Network network.')
                    }
                }

                if (store.get('address')) {
                    account = store.get('address').toLowerCase()
                } else if (this.$store.state.address) {
                    account = this.$store.state.address.toLowerCase()
                } else if (self.web3) {
                    account = await self.getAccount()
                }

                if (!account) {
                    return false
                    // if (store.get('address') && self.provider !== 'custom') {
                    //     account = store.get('address')
                    // } else return false
                }

                self.address = account
                const rpcAccount = self.toRpcAddress(account)
                self.web3.eth.getBalance(rpcAccount).then(balanceBN => {
                    self.balance = new BigNumber(balanceBN).div(10 ** 18)
                }).catch(e => {
                    self.$toasted.show('Cannot load balance', { type: 'error' })
                })

                let whPromise = axios.get(`/api/owners/${self.address}/withdraws?limit=100`)
                if (contract) {
                    try {
                        let blksPromise = contract.methods.getWithdrawBlockNumbers().call({ from: rpcAccount })
                        const blks = await blksPromise

                        await Promise.all(blks.map(async (it, index) => {
                            let blk = new BigNumber(it).toString()
                            if (blk !== '0') {
                                self.aw = true
                            }
                            console.log(blk, 'blk')
                            let wd = {
                                blockNumber: blk
                            }
                            wd.cap = new BigNumber(
                                await contract.methods.getWithdrawCap(blk).call({ from: rpcAccount })
                            ).div(10 ** 18).toFormat()
                            wd.estimatedTime = await self.getSecondsToHms(
                                (wd.blockNumber - self.chainConfig.blockNumber)
                            )
                            self.withdraws[index] = wd
                        }))
                        await this.setKYCStatus(contract)
                    } catch (contractError) {
                        console.log(contractError)
                    }
                }

                self.wh = []
                try {
                    const wh = await whPromise
                    wh.data.forEach(w => {
                        let it = {
                            cap: new BigNumber(w.capacity).div(10 ** 18).toFormat(),
                            tx: w.tx
                        }
                        self.wh.push(it)
                    })
                } catch (whError) {
                    console.log(whError)
                }
                self.isReady = true
            } catch (e) {
                console.log(e)
                const detail = self.formatWalletError
                    ? self.formatWalletError(e)
                    : (e && e.message ? e.message : String(e))
                self.$toasted.show(detail, {
                    type : 'error'
                })
            }
        }
        if (self.provider === 'XDCwallet' && !self.address) {
            const hasQRCOde = self.loginByQRCode()
            if (await hasQRCOde) {
                self.interval = setInterval(async () => {
                    await this.getLoginResult()
                }, 3000)
            }
        }
        await self.setupAccount()
    },
    mounted () {},
    methods: {
        getValidationClass: function (fieldName) {
            let field = this.$v[fieldName]
            if (typeof this.$v.networks[fieldName] !== 'undefined') {
                field = this.$v.networks[fieldName]
            }
            if (field) {
                return {
                    'is-invalid': field.$error
                }
            }
        },
        validate: function () {
            if (this.provider === 'connect-wallet') {
                this.save()
            }
            if (this.provider === 'metamask' || this.provider === 'xinpay') {
                this.save()
            }

            this.$v.$touch()
            if (this.provider === 'custom' && !this.$v.mnemonic.$invalid) {
                this.save()
            }
            if (this.provider === 'ledger' && !this.$v.hdPath.$invalid) {
                this.selectHdPath()
            }
            if (this.provider === 'trezor' && !this.$v.hdPath.$invalid) {
                this.hdPath = "m/44'/60'/0'/0"
                this.selectHdPath()
            }
        },
        selectHdPath: async function (offset = 0, limit = defaultWalletNumber) {
            let self = this
            let wallets
            try {
                self.loading = true
                if (self.provider === 'ledger' || self.provider === 'trezor') {
                    const rpc = self.networks.rpc || self.chainConfig.rpc
                    const httpWeb3 = new Web3(new Web3.providers.HttpProvider(rpc))
                    await self.setupProvider(self.provider, httpWeb3)
                }
                store.set('hdDerivationPath', self.hdPath)
                if (offset === 0) {
                    store.remove('ledgerDevicePath')
                    self.hdWallets = {}
                    self.selectedHdWalletIndex = '0'
                }
                if (self.provider === 'trezor') {
                    await self.unlockTrezor()
                    wallets = await self.loadTrezorWallets(offset, limit)
                } else {
                    await self.unlockLedger()
                    const ledgerFallback = store.get('ledgerPathFallbackMessage')
                    if (ledgerFallback) {
                        self.$toasted.show(ledgerFallback, { type: 'info' })
                        store.remove('ledgerPathFallbackMessage')
                    }
                    wallets = await self.loadMultipleLedgerWallets(offset, limit)
                }
                if (wallets && Object.keys(wallets).length > 0) {
                    if (offset === 0) {
                        self.hdWallets = wallets
                    } else {
                        Object.assign(self.hdWallets, wallets)
                    }
                    if (!self.hdWallets[self.selectedHdWalletIndex]) {
                        self.selectedHdWalletIndex = String(Object.keys(self.hdWallets)[0])
                    }
                    self.showHdWalletModal = true
                    self.$toasted.show('Select a wallet address to continue', { type: 'info' })
                } else {
                    self.$toasted.show('No wallet addresses found for this path.', { type: 'error' })
                }
            } catch (error) {
                console.log(error.message)
                self.$toasted.show(error.message || error, {
                    type : 'error'
                })
            } finally {
                self.loading = false
            }
        },
        save: async function () {
            const self = this
            const isHardwareWallet = self.provider === 'ledger' || self.provider === 'trezor'
            const selectedAddress = isHardwareWallet &&
                self.hdWallets[self.selectedHdWalletIndex]
                ? self.hdWallets[self.selectedHdWalletIndex].address
                : null

            if (isHardwareWallet && !selectedAddress) {
                self.$toasted.show('Please select a wallet address first.', { type: 'error' })
                self.showHdWalletModal = true
                return
            }

            if (!isHardwareWallet) {
                store.clearAll()
            } else {
                const keepConfig = store.get('configMaster')
                const keepLedgerDevicePath = store.get('ledgerDevicePath')
                store.clearAll()
                if (keepConfig) {
                    store.set('configMaster', keepConfig)
                }
                if (keepLedgerDevicePath) {
                    store.set('ledgerDevicePath', keepLedgerDevicePath)
                }
            }

            self.address = ''
            self.$store.state.address = null
            // clear old data
            self.withdraws = []
            self.aw = []
            self.wh = []
            var wjs = false
            self.loading = true
            try {
                switch (self.provider) {
                case 'connect-wallet':
                    let ethereumProvider = await this.walletConnectProvider(self.chainConfig)
                    await ethereumProvider.connect()
                    self.address = ethereumProvider.accounts[0]
                    ethereumProvider.on('disconnect', (code, reason) => {
                        store.clearAll()
                        Object.assign(this.$store.state, Helper.getDefaultState())

                        this.$router.go({
                            path: '/'
                        })
                    })
                    wjs = new Web3(ethereumProvider)
                    break
                case 'metamask':
                    if (window.web3) {
                        const p = window.web3.currentProvider
                        wjs = new Web3(p)
                    }
                    break
                case 'xinpay':
                    if (window.XDCWeb3) {
                        var pp = window.XDCWeb3.currentProvider
                        wjs = new Web3(pp)
                    }
                    break
                case 'ledger':
                case 'trezor':
                    store.set('hdDerivationPath', self.hdPath)
                    store.set('offset', String(self.selectedHdWalletIndex))
                    store.set('network', self.provider)
                    if (selectedAddress) {
                        store.set('address', selectedAddress.toLowerCase())
                    }
                    await self.detectNetwork(self.provider)
                    if (!self.web3) {
                        throw new Error('Could not initialize the Ledger provider. Reconnect your device and try again.')
                    }
                    wjs = self.web3
                    break
                default:
                    self.mnemonic = self.mnemonic.trim()
                    const walletProvider =
                        (self.mnemonic.indexOf(' ') >= 0)
                            ? new HDWalletProvider(
                                self.mnemonic.trim(),
                                self.chainConfig.rpc, 0, 1, self.hdPath)
                            : new PrivateKeyProvider(self.mnemonic, self.chainConfig.rpc)
                    wjs = new Web3(walletProvider)
                    break
                }
                if (wjs) {
                    await self.setupProvider(this.provider, wjs)
                }
                await self.setupAccount()

                if (isHardwareWallet && selectedAddress) {
                    self.address = selectedAddress.toLowerCase()
                    store.set('address', self.address)
                }

                self.loading = false

                if (self.address) {
                    const normalizedAddress = self.address.toLowerCase()
                    self.address = normalizedAddress
                    self.$store.state.address = normalizedAddress
                    store.set('address', normalizedAddress)
                    store.set('network', self.provider)
                    self.showHdWalletModal = false
                    self.$bus.$emit('logged', 'user logged')
                    self.$toasted.show('Logged in successfully')
                } else {
                    self.$toasted.show('Could not log in with the selected wallet.', { type: 'error' })
                }
            } catch (e) {
                self.loading = false
                const detail = self.formatWalletError
                    ? self.formatWalletError(e)
                    : (e && e.message ? e.message : String(e))
                self.$toasted.show(detail || 'There are some errors when changing the network provider', {
                    type : 'error'
                })
                console.log(e)
            }
        },
        async loginByQRCode () {
            // generate qr code
            const { data } = await axios.get('/api/auth/generateLoginQR')
            this.id = data.id
            this.qrCode = encodeURI(
                'xdcchain:login?message=' + data.message +
                '&submitURL=' + data.url
            )
            this.qrCodeApp = encodeURI(
                'xdcchain://login?message=' + data.message +
                '&submitURL=' + data.url
            )
            return true
        },
        async getLoginResult () {
            // calling api every 2 seconds
            const { data } = await axios.get('/api/auth/getLoginResult?id=' + this.id)

            if (!data.error && data) {
                this.loading = true
                if (self.interval) {
                    clearInterval(self.interval)
                }
                await this.getAccountInfo(data.user)
            }
        },
        async onChangeSelect (event) {
            switch (event) {
            case 'XDCwallet':
                await this.loginByQRCode()
                this.interval = setInterval(async () => {
                    await this.getLoginResult()
                }, 3000)
                break
            case 'trezor':
                this.hdPath = "m/44'/60'/0'/0"
                break
            case 'ledger':
                this.hdPath = store.get('hdDerivationPath') || this.hdPath
                break
            default:
                if (this.interval) {
                    clearInterval(this.interval)
                }
                break
            }
        },
        async getAccountInfo (account) {
            const self = this
            let contract
            self.address = account
            self.$store.state.address = account
            const web3 = new Web3(new HDWalletProvider(
                '',
                self.chainConfig.rpc, 0, 1, self.hdPath))

            await self.setupProvider(this.provider, web3)
            try {
                // contract = await self.getXDCValidatorInstance()
                contract = self.XDCValidator
            } catch (error) {
                if (self.interval) {
                    clearInterval(self.interval)
                }
                self.$toasted.show('Make sure you choose correct xdcchain network.', {
                    type : 'error'
                })
            }

            self.web3.eth.getBalance(self.address, function (a, b) {
                self.balance = new BigNumber(b).div(10 ** 18).toFormat()
                if (a) {
                    console.log('got an error', a)
                }
            })
            if (contract) {
                // let blks = await contract.getWithdrawBlockNumbers.call({ from: account })
                let blks = await contract.methods.getWithdrawBlockNumbers().call({ from: account })

                await Promise.all(blks.map(async (it, index) => {
                    let blk = new BigNumber(it).toString()
                    if (blk !== '0') {
                        self.aw = true
                    }
                    let wd = {
                        blockNumber: blk
                    }
                    wd.cap = new BigNumber(
                        // await contract.getWithdrawCap.call(blk, { from: account })
                        await contract.methods.getWithdrawCap(blk).call({ from: account })
                    ).div(10 ** 18).toFormat()
                    wd.estimatedTime = await self.getSecondsToHms(
                        (wd.blockNumber - self.chainConfig.blockNumber)
                    )
                    self.withdraws[index] = wd
                }))
            }

            let wh = await axios.get(`/api/owners/${self.address}/withdraws?limit=100`)
            self.wh = []
            wh.data.forEach(w => {
                let it = {
                    cap: new BigNumber(w.capacity).div(10 ** 18).toFormat(),
                    tx: w.tx
                }
                self.wh.push(it)
            })
            self.isReady = true
            self.loading = false
            store.set('address', account.toLowerCase())
            store.set('network', self.provider)
            self.$bus.$emit('logged', 'user logged')
            self.$toasted.show('Network Provider was changed successfully')
            if (this.interval) {
                clearInterval(this.interval)
            }
        },
        changeView (w, k) {
            const txFee = new BigNumber(this.chainConfig.gas * this.gasPrice).div(10 ** 18)

            if (this.balance.isGreaterThanOrEqualTo(txFee)) {
                this.$router.push({ name: 'CandidateWithdraw',
                    params: {
                        address: this.address,
                        blockNumber: w.blockNumber,
                        capacity: w.cap,
                        index: k
                    }
                })
            } else {
                this.$toasted.show('Not enough XDC for transaction fee', {
                    type : 'info'
                })
            }
        },
        closeModal () {
            this.showHdWalletModal = false
        },
        async setHdPath () {
            if (!this.hdWallets[this.selectedHdWalletIndex]) {
                this.$toasted.show('Please select a wallet address.', { type: 'error' })
                return
            }
            store.set('hdDerivationPath', this.hdPath)
            store.set('offset', this.selectedHdWalletIndex)
            this.showHdWalletModal = false
            await this.save()
        },
        async moreHdAddresses () {
            if (this.loadingMoreHdAddresses) {
                return
            }
            this.loadingMoreHdAddresses = true
            try {
                await this.selectHdPath(Object.keys(this.hdWallets).length, defaultWalletNumber)
            } finally {
                this.loadingMoreHdAddresses = false
            }
        },
        async setKYCStatus (contract) {
            // const isHashFound = await contract.methods.getHashCount().call({ from:this.address })
            const isHashFound = await contract.methods.getHashCount(this.address).call()
            console.log(isHashFound, 'isHashFound')
            console.log(new BigNumber(isHashFound).toNumber(), 'KYC uploaded successfully')
            if (new BigNumber(isHashFound).toNumber()) {
                const getKYC = await contract.methods.getLatestKYC(this.address).call()
                // const KYCString = await contract.KYCString.call(this.address)
                this.KYCStatus = getKYC
            }
        },
        changePath (path) {
            this.hdPath = path
        },
        formatWalletAddress (address) {
            return this.formatAddressByHdPath(address, this.hdPath)
        },
        getDisplayAddress (address) {
            return this.formatAddressByHdPath(address, this.hdPath || this.getHdBasePath())
        },
        getVoterLinkPath (address) {
            return '/voter/xdc' + this.toRpcAddress(address).substring(2)
        }
    }
}
</script>
