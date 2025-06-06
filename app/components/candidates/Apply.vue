<template>
    <div>
        <div
            class="XDC-header">
            <div class="container">
                <div class="XDC-header-block">
                    <div class="XDC-header-block-left">
                        <div>
                            <i class="tm-wallet XDC-header__icon" />
                        </div>
                        <div>
                            <h4 class="h4 color-black">Become a MasterNode</h4>
                            <p>
                                Become a MasterNode and upload the Know Your Community (KYC) certificate in PDF format.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="main-content container">
            <b-row
                class="m-0">
                <div class="col-12 col-md-6 col-lg-6">
                    <b-card
                        :class="'XDC-card XDC-card--lighter'
                        + (loading ? ' XDC-loading' : '')">
                        <h4 class="h4 color-black XDC-card__title"><strong>Become a MasterNode</strong></h4>
                        <template v-if="!KYC.status">
                            <ul class="XDC-list list-unstyled">
                                <li class="XDC-list__item">
                                    <!-- <i class="tm-XDC XDC-list__icon" /> -->
                                    <div class="XDC-list__text">
                                        <p class="graf graf--p graf-after--figure"><strong class="markup--strong markup--p-strong"> Become a MasterNode </strong>and upload the <strong class="markup--strong markup--p-strong">Know Your Community (KYC) certificate</strong> in PDF format.</p>
                                        <p class="graf graf--p graf-after--p">This KYC certificate needs to be signed by one of the following personnel:</p>
                                        <ul class="postList"><li>Company Secretary,</li><li>A Notary Public,</li><li>Chartered Secretary,</li><li >Consulate, or</li><li>A lawyer with Seal.</li></ul>
                                        <p class="graf graf--p graf-after--li">For <strong class="markup--strong markup--p-strong">INDIVIDUAL format</strong>, <a href="https://docs.google.com/document/d/1Us9chjXEDYrDOpfuwWITxaQOSEYxYIpJpwWuYK0TyXY" ><strong class="markup--strong markup--p-strong">click here</strong></a>.</p>
                                        <p>For <strong class="markup--strong markup--p-strong">ORGANIZATION format</strong>, <a href="https://docs.google.com/document/d/1eyjFp3DXhrpLscngELocmXFwJ_Y8H9si6n8Z2SLADhg"><strong class="markup--strong markup--p-strong">click here</strong></a>.</p>
                                        <p><em class="markup--em markup--p-em">Note: It’s mandatory to upload the certificate in a </em><strong class="markup--strong markup--p-strong"><em class="markup--em markup--p-em">PDF format</em></strong><em class="markup--em markup--p-em">.</em></p>
                                    </div>
                                </li>
                                <!-- <li class="XDC-list__item">
                                    <i class="tm-lock XDC-list__icon" />
                                    <span class="XDC-list__text">Create PDF file with mention Certify KYC document.</span>
                                </li> -->
                                <!-- <li class="XDC-list__item">
                                    <i class="tm-arrow-up XDC-list__icon" />
                                    <span class="XDC-list__text">
                                        Coin holders are able to vote for you to become a masternode</span>
                                </li> -->
                            </ul>
                        </template>
                        <template v-else>
                            <ul class="XDC-list list-unstyled">
                                <li class="XDC-list__item">
                                    <i class="tm-XDC XDC-list__icon" />
                                    <span class="XDC-list__text">You have to deposit at least 10,000,000 XDC</span>
                                </li>
                                <li class="XDC-list__item">
                                    <i class="tm-lock XDC-list__icon" />
                                    <span class="XDC-list__text">Your deposit will be locked</span>
                                </li>
                            </ul>

                            <b-form
                                class="XDC-form XDC-form--apply"
                                novalidate
                                @submit.prevent="validate()">
                                <b-form-group
                                    :description="`How much XDC do you want to deposit? TX fee: ${txFee} XDC`"
                                    label="Stake"
                                    label-for="apply-value">
                                    <b-input-group>
                                        <p class="form-control">{{ applyValue }}</p>
                                        <!--<number-input
                                            :class="getValidationClass('applyValue')"
                                            :min="0.1"
                                            :step="0.1"
                                            v-model="applyValue"
                                            name="apply-value"/>-->
                                        <b-input-group-append>
                                            <i class="tm-XDC" />
                                        </b-input-group-append>
                                        <span
                                            v-if="$v.applyValue.$dirty && !$v.applyValue.required"
                                            class="text-danger">Required field</span>
                                        <span
                                            v-else-if="$v.applyValue.$dirty && !$v.applyValue.minValue"
                                            class="text-danger">Must be greater than 10,000,000 XDC</span>
                                    </b-input-group>
                                </b-form-group>
                                <b-form-group
                                    label="Coinbase Address"
                                    label-for="coinbase"
                                    description="What is your node coinbase address?">
                                    <b-form-input
                                        :class="getValidationClass('coinbase')"
                                        v-model="coinbase"
                                        name="coinbase"
                                        autocomplete="off"
                                        type="text"/>
                                    <span
                                        v-if="$v.coinbase.$dirty && !$v.coinbase.required"
                                        class="text-danger">Required field</span>
                                    <span
                                        v-else-if="!$v.coinbase.coinbaseAddress"
                                        class="text-danger">Wrong coinbase address format</span>
                                    <span
                                        v-else-if="coinbaseError"
                                        class="text-danger">
                                        The masternode candidate account should be different from the depositing account.
                                    </span>
                                    <span
                                        v-else-if="candidateError"
                                        class="text-danger">
                                        This coinbase address is already a candidate
                                    </span>
                                </b-form-group>
                                <!--b-form-group
                                    label="Node URL"
                                label-for="nodeurl"
                                description="What is your node url?">
                                <b-form-input
                                    :class="getValidationClass('nodeUrl')"
                                    v-model="nodeUrl"
                                    name="coinbase"
                                    type="text"/>
                                <span
                                    v-if="$v.nodeUrl.$dirty && !$v.nodeUrl.required"
                                    class="text-danger">Required field</span>
                                <span
                                    v-else-if="$v.nodeUrl.$dirty && !$v.nodeUrl.nodeUrl"
                                    class="text-danger">Wrong node URL format</span>
                            </b-form-group-->
                                <div class="buttons text-right">
                                    <b-button
                                        type="button"
                                        variant="secondary"
                                        @click="$router.go(-1)">Cancel</b-button>
                                    <b-button
                                        type="submit"
                                        variant="primary">Apply</b-button>
                                </div>
                            </b-form>
                        </template>
                    </b-card>
                </div>
                <div
                    v-if="!KYC.status"
                    class="col-12 col-md-6 col-lg-6">
                    <b-card
                        :class="'XDC-card XDC-card--lighter'
                        + (loading ? ' XDC-loading' : '')">
                        <h4 class="h4 color-black XDC-card__title"><strong>Upload KYC Document</strong></h4>
                        <template>
                            <b-form
                                class="XDC-form XDC-form--apply"
                                novalidate
                                enctype="multipart/form-data"
                                @submit.prevent="uploadKYC()">
                                <!--<vue-dropzone
                                    id="dropzone"
                                    ref="myVueDropzone"
                                    :options="dropzoneOptions"/>-->
                                <b-form-file
                                    v-model="KYC.file"
                                    :state="Boolean(KYC.file)"
                                    class="z-index-0 XDC-upload"
                                    accept="application/pdf"
                                    placeholder="Choose a file..."
                                    required
                                />
                                <span
                                    v-if="KYC && !KYC.file"
                                    class="text-danger">Required field (only *.pdf allowed)</span>
                                <div class="buttons text-right">
                                    <b-button
                                        type="submit"
                                        variant="primary">Upload KYC</b-button>
                                </div>
                            </b-form>
                        </template>
                    </b-card>
                </div>
            </b-row>
            <b-modal
                ref="applyModal"
                class="XDC-modal"
                centered
                title="Scan this QR code by xdcwallet"
                hide-footer>
                <div
                    v-if="provider === 'xdcwallet'"
                    style="text-align: center">
                    <vue-qrcode
                        :value="qrCode"
                        :options="{size: 200 }"
                        class="img-fluid text-center text-lg-right"/>
                </div>
                <b-btn
                    class="mt-3"
                    variant="outline-danger"
                    block
                    @click="hideModal">Close</b-btn>
            </b-modal>
        </div>
    </div>
</template>
<script>
import { validationMixin } from 'vuelidate'
import {
    required,
    minValue
} from 'vuelidate/lib/validators'
import coinbaseAddress from '../../../validators/coinbaseAddress.js'
// import nodeUrl from '../../../validators/nodeUrl.js'
import NumberInput from '../NumberInput.vue'
import BigNumber from 'bignumber.js'
import store from 'store'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import axios from 'axios'
import vue2Dropzone from 'vue2-dropzone'

export default {
    name: 'App',
    components: {
        NumberInput,
        VueQrcode,
        vueDropzone: vue2Dropzone
    },
    mixins: [validationMixin],
    data () {
        return {
            account: '',
            isReady: !!this.web3,
            applyValue: '10000000',
            coinbase: '',
            // nodeUrl: '',
            loading: false,
            coinbaseError: false,
            provider: this.NetworkProvider || store.get('network') || null,
            showQR: true,
            qrCode: 'text',
            interval: null,
            candidateError: false,
            balance: 0,
            txFee: 0,
            gasPrice: null,
            transactionHash: '',
            toastMessage: 'You have successfully applied!',
            toastMessageError: 'An error occurred while applying, please try again',
            KYC: {
                file: '',
                status: false
            },
            dropzoneOptions: {
                url: 'https://httpbin.org/post',
                acceptedFiles: 'application/pdf'
            }
        }
    },
    validations: {
        applyValue: {
            required,
            minValue: minValue(10000000)
        },
        coinbase: {
            required,
            coinbaseAddress
        }
        /*
        nodeUrl: {
            required,
            nodeUrl
        },
        */
    },
    computed: { },
    watch: {},
    updated () {},
    beforeDestroy () {
        if (this.interval) {
            clearInterval(this.interval)
        }
    },
    created: async function () {
        const self = this
        self.config = store.get('configMaster') || await self.appConfig()
        self.chainConfig = self.config.blockchain || {}
        try {
            self.isReady = !!self.web3
            self.gasPrice = await self.web3.eth.getGasPrice()
            self.txFee = new BigNumber(this.chainConfig.gas * self.gasPrice).div(10 ** 18).toString(10)
            if (!self.web3 && self.NetworkProvider === 'metamask') {
                throw Error('Web3 is not properly detected. Have you installed MetaMask extension?')
            }
            self.account = store.get('address') ||
                self.$store.state.address || await self.getAccount()
            if (self.account.substring(0, 2) === '0x') {
                self.account = 'xdc' + self.account.substring(2)
            }
            await self.getKYCStatus(self.account)
        } catch (e) {
            self.$toasted.show(`You need login your account before voting`,
                {
                    type : 'default',
                    duration: 5000,
                    action : [
                        {
                            text : 'Login',
                            onClick : (e, toastObject) => {
                                self.$router.push({ path: '/setting' })
                            }
                        }
                    ]
                })
            self.$router.push({ path: '/setting' })
            console.log(e)
        }
    },
    mounted () {
    },
    methods: {
        getValidationClass: function (fieldName) {
            const field = this.$v[fieldName]

            if (field) {
                return {
                    'is-invalid': field.$error
                }
            }
        },
        validate: async function () {
            this.$v.$touch()
            this.coinbaseError = false

            if (!this.$v.$invalid) {
                if (this.coinbase.toLowerCase() === this.account.toLowerCase()) {
                    this.coinbaseError = true
                } else {
                    // Check balance
                    const balanc = await this.web3.eth.getBalance(this.account)
                    this.balance = new BigNumber(balanc).div(10 ** 18)
                    const convertedAmount = new BigNumber(this.applyValue)

                    if (this.balance.isLessThan(convertedAmount)) {
                        this.$toasted.show(`Not enough XDC`, {
                            type: 'error'
                        })
                        return false
                    }
                    if (this.coinbase.substring(0, 3) === 'xdc') {
                        this.coinbase = '0x' + this.coinbase.substring(3)
                    }
                    const { data } = await axios.get('/api/candidates/' + this.coinbase + '/isCandidate')
                    if (data) {
                        this.candidateError = true
                    } else {
                        this.candidateError = false
                        if (this.provider !== 'xdcwallet') {
                            await this.apply()
                        } else {
                            if (this.interval) {
                                clearInterval(this.interval)
                            }
                            await this.generateQR()
                            this.$refs.applyModal.show()
                        }
                    }
                }
            }
        },
        apply: async function () {
            let self = this
            let value = this.applyValue
            let coinbase = this.coinbase.toLowerCase()
            // let nodeUrl = this.nodeUrl

            try {
                if (!self.isReady) {
                    self.$router.push({ path: '/setting' })
                    throw Error('Web3 is not properly detected.')
                }

                self.loading = true

                let contract// = await self.getXDCValidatorInstance()
                contract = self.XDCValidator
                const account = (await self.getAccount() || '').toLowerCase()
                let txParams = {
                    from : account,
                    value: self.web3.utils.toHex(new BigNumber(value).multipliedBy(10 ** 18).toString(10)),
                    gasPrice: self.web3.utils.toHex(self.gasPrice),
                    gas: self.web3.utils.toHex(self.chainConfig.gas),
                    gasLimit: self.web3.utils.toHex(self.chainConfig.gas),
                    chainId: self.chainConfig.networkId
                }
                if (self.NetworkProvider === 'ledger' ||
                    self.NetworkProvider === 'trezor') {
                    let nonce = await self.web3.eth.getTransactionCount(account)
                    // let dataTx = contract.propose.request(coinbase).params[0]
                    const data = await contract.methods.propose(coinbase).encodeABI()
                    const dataTx = {
                        data,
                        to: self.chainConfig.validatorAddress
                    }
                    Object.assign(
                        dataTx,
                        dataTx,
                        txParams,
                        {
                            nonce: self.web3.utils.toHex(nonce)
                        }
                    )
                    let signature = await self.signTransaction(dataTx)
                    const txHash = await self.sendSignedTransaction(dataTx, signature)
                    if (txHash) {
                        self.transactionHash = txHash
                        let check = true
                        while (check) {
                            const receipt = await self.web3.eth.getTransactionReceipt(txHash)
                            if (receipt) {
                                check = false
                                self.$toasted.show(self.toastMessage)
                                if (coinbase.substring(0, 2) === '0x') {
                                    coinbase = 'xdc' + coinbase.substring(2)
                                }
                                setTimeout(() => {
                                    self.loading = false
                                    if (self.transactionHash) {
                                        self.$router.push({ path: `/candidate/${coinbase}` })
                                    }
                                }, 2000)
                            }
                        }
                    }
                } else {
                    // rs = await contract.propose(coinbase, txParams)
                    contract.methods.propose(coinbase).send(txParams)
                        .on('transactionHash', async (txHash) => {
                            self.transactionHash = txHash
                            let check = true
                            while (check) {
                                const receipt = await self.web3.eth.getTransactionReceipt(txHash)
                                if (receipt) {
                                    check = false
                                    self.$toasted.show(self.toastMessage)
                                    setTimeout(() => {
                                        self.loading = false
                                        if (self.transactionHash) {
                                            self.$router.push({ path: `/candidate/${coinbase}` })
                                        }
                                    }, 2000)
                                }
                            }
                        }).catch(e => {
                            console.log(e)
                            self.loading = false
                            self.$toasted.show(self.toastMessageError + e, { type: 'error' })
                        })
                }
            } catch (e) {
                self.loading = false
                self.$toasted.show(`An error occurred while applying, please fix it and try again: ${String(e)}`, {
                    type: 'error'
                })
                console.log(e)
                if (self.interval) {
                    clearInterval(self.interval)
                }
            }
        },
        hideModal () {
            this.$refs.applyModal.hide()
        },
        async generateQR () {
            const self = this
            const coinbase = self.coinbase.toLowerCase()

            if (self.interval) {
                clearInterval(self.interval)
            }

            try {
                const amount = new BigNumber(self.applyValue).toString(10)
                const body = {
                    action: 'propose',
                    voter: self.account.toLowerCase(),
                    candidate: coinbase,
                    amount
                }
                // call api to generate qr code
                const { data } = await axios.post(`/api/voters/generateQR`, body)

                self.message = data.message
                self.id = data.id
                self.qrCode = encodeURI(
                    'masternode-app:propose?amount=' + amount +
                    '&candidate=' + coinbase +
                    '&submitURL=' + data.url
                )

                // set interval
                self.interval = setInterval(async () => {
                    self.verifyScannedQR()
                }, 3000)
            } catch (e) {
                console.log(e)
            }
        },
        async verifyScannedQR () {
            let self = this
            let coinbase = this.coinbase.toLowerCase()
            try {
                let { data } = await axios.get('/api/voters/getScanningResult?action=propose&id=' + self.id)

                if (!data.error) {
                    self.hideModal()
                    self.loading = true
                    if (data.tx) {
                        clearInterval(self.interval)
                        let toastMessage = data.tx ? 'You have successfully applied!'
                            : 'An error occurred while applying, please try again'
                        self.$toasted.show(toastMessage)
                        setTimeout(() => {
                            if (data.tx) {
                                self.loading = false
                                self.$router.push({ path: `/candidate/${coinbase}` })
                            }
                        }, 3000)
                    }
                }
            } catch (e) {
                console.log(e)
                self.$toasted.show(`An error occurred while excuting. ${String(e)}`, {
                    type: 'error'
                })
                clearInterval(self.interval)
            }
        },
        async getKYCStatus (account) {
            // let contract = await this.getXDCValidatorInstance()
            let contract = this.XDCValidator
            if (contract) {
                console.log('getKYC')
                const isHashFound = await contract.methods.getHashCount(account).call()
                if (new BigNumber(isHashFound).toNumber()) {
                    const getKYC = await contract.methods.getLatestKYC(account).call()
                    // const KYCString = await contract.KYCString.call(account)
                    console.log(getKYC, 'getKYC')
                    this.KYC.status = getKYC
                }
            } else {
                console.log('1111')
            }
        },
        async uploadKYC () {
            try {
                let self = this
                if (this.KYC && !!this.KYC.file) {
                    if (this.KYC.file.type !== 'application/pdf') {
                        this.KYC.file = null
                        return false
                    }

                    this.loading = true
                    const formData = new FormData()
                    formData.append('filename', this.KYC.file, this.KYC.file.name)
                    const { data } = await axios.post('/api/ipfs/addKYC', formData)
                    let contract// = await self.getXDCValidatorInstance()
                    contract = self.XDCValidator
                    const currentGasPrice = this.web3.utils.toBN(await this.web3.eth.getGasPrice())
                    const gasPrice = currentGasPrice.muln(14).divn(10)
                    let txParams = {
                        from : this.account,
                        gasPrice: this.web3.utils.toHex(gasPrice),
                        gasLimit: this.web3.utils.toHex(3000000)
                    }
                    console.log(`>>>>>>>>>>>>TxParams ${txParams}`)
                    console.log(`>>>>>>>>>>>>HASH${data.hash}`)
                    console.log(`>>>>>>>>>>>>Before`)
                    // console.log(`>>>>>>>>>>>>${contract.mgetCandidates()}`)
                    await contract.methods.uploadKYC(data.hash).send(txParams)
                    // await contract.propose(coinbase, txParams)
                    // console.log(`>>>>>>>${rs}`)
                    // await contract.getCandidates()
                    this.KYC.status = true
                    this.loading = false
                    this.$toasted.show('KYC uploaded successfully')
                }
            } catch (e) {
                console.log(e)
                this.loading = false
                this.$toasted.show(`An error occurred while excuting. ${String(e)}`, {
                    type: 'error'
                })
            }
        }
    }
}
</script>
