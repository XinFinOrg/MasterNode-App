<template>
    <div>
        <div
            class="container section section--status">
            <div class="row">
                <div class="col-12">
                    <h3 class="section-title">
                        <i class="tm-bolt color-pink" />
                        <span>Network Status</span>
                    </h3>
                </div>
                <div class="col-md-6 col-lg-3">
                    <b-card class="XDC-card">
                        <h6 class="XDC-card__title">Current Block</h6>
                        <p class="XDC-card__text">
                            #{{ chainConfig.blockNumber }}
                        </p>
                        <img
                            src="/app/assets/img/current_block-icon.png"
                            class="XDC-card__img"
                        >
                    </b-card>
                </div>
                <div class="col-md-6 col-lg-3">
                    <b-card class="XDC-card XDC-card">
                        <h6 class="XDC-card__title">Block Time</h6>
                        <p class="XDC-card__text">{{ chainConfig.blockTime }}.00 s</p>
                        <img
                            src="/app/assets/img/block_time-icon.png"
                            class="XDC-card__img1"
                        >
                    </b-card>
                </div>
                <div class="col-md-6 col-lg-3">
                    <b-card class="XDC-card XDC-card">
                        <h6 class="XDC-card__title">Epoch</h6>
                        <p class="XDC-card__text">
                            #{{ Math.floor(chainConfig.blockNumber / chainConfig.epoch) + 1 }}</p>
                        <img
                            src="/app/assets/img/epoch-icon.png"
                            class="XDC-card__img2"
                        >
                    </b-card>
                </div>
                <div class="col-md-6 col-lg-3">
                    <b-card class="XDC-card XDC-card">
                        <h6 class="XDC-card__title">Next Checkpoint</h6>
                        <p class="XDC-card__text">
                            <!-- eslint-disable-next-line max-len -->
                            #{{ parseInt(chainConfig.epoch) * (Math.floor(parseInt(chainConfig.blockNumber) / parseInt(chainConfig.epoch) + 1)) }}</p>
                        <img
                            src="/app/assets/img/next_checkpoint-icon.png"
                            class="XDC-card__img3"
                        >
                    </b-card>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="row">
                <div class="col-12">
                    <h3 class="section-title--masternodes">
                        <div class="masternode-bar">
                            <i class="tm-flag color-yellow" />
                            <span>Candidates</span>
                            <span class="text-truncate section-title__description">
                                <a
                                    v-if="activeCandidates !== 0"
                                    :class="currentTable === 'masternodes' ? 'tab-active' : ''"
                                    @click="changeTable('masternodes')">Masternodes ({{ activeCandidates }})</a>
                                <span v-if="slashedMN !== 0">|</span>
                                <a
                                    v-if="slashedMN !== 0"
                                    :class="currentTable === 'slashed' ? 'tab-active' : ''"
                                    @click="changeTable('slashed')">Slashed MNs ({{ slashedMN }})</a>
                                <span v-if="totalProposedNodes !== 0">|</span>
                                <a
                                    v-if="totalProposedNodes !== 0"
                                    :class="currentTable === 'proposed' ? 'tab-active' : ''"
                                    @click="changeTable('proposed')">Proposed Nodes ({{ totalProposedNodes }})</a>
                                <span v-if="resignedMN !== 0">|</span>
                                <a
                                    v-if="resignedMN !== 0"
                                    :class="currentTable === 'resigned' ? 'tab-active' : ''"
                                    @click="changeTable('resigned')">Resigned Nodes ({{ resignedMN }})</a>
                            </span>
                        </div>
                    </h3>
                </div>
            </div>
        </div>

        <div
            v-if="candidates.length <= 0"
            class="XDC-loading"/>
        <div
            v-else
            class="container">
            <b-table
                :items="candidates"
                :fields="fields"
                :per-page="perPage"
                :class="'XDC-table XDC-table--candidates ' + tableCssClass"
                empty-text="There are no candidates to show"
                stacked="lg"
                @sort-changed="sortingChange" >

                <template
                    slot="address"
                    slot-scope="data">
                    <router-link
                        :to="'/candidate/' + data.item.address">
                        {{ truncate(data.item.address, 18) }}
                    </router-link>
                </template>

                <template
                    slot="name"
                    slot-scope="data">
                    <div
                        :id="`name_${data.index}`"
                        class="text-truncate">
                        {{ data.item.name }}
                    </div>
                    <b-tooltip
                        v-if="data.item.name.length > 20"
                        :target="`name_${data.index}`">
                        {{ data.item.name }}
                    </b-tooltip>
                </template>

                <template
                    slot="capacity"
                    slot-scope="data">{{ formatCurrencySymbol(formatBigNumber(data.item.cap, 2)) }}
                </template>

                <template
                    slot="latestSignedBlock"
                    slot-scope="data">
                    <div>
                        <span
                            :class="`XDC-status-dot float-left mr-2 XDC-status-dot--${getColor(
                            data.item.latestSignedBlock || 0, currentBlock)}`">
                            {{ data.item.latestSignedBlock || 0 }}
                        </span>
                    </div>
                </template>

                <template
                    slot="status"
                    slot-scope="data">
                    <div class="mt-2 mt-lg-0">
                        <span
                            :class="'XDC-chip '
                                + (data.item.status === 'PROPOSED' || data.item.status === 'MASTERNODE' ?
                            'XDC-chip--primary' : 'XDC-chip--accent') ">
                            {{ data.item.status.toUpperCase() }}
                        </span>
                    </div>
                </template>
            </b-table>
            <b-pagination
                v-if="totalRows > 0 && totalRows > perPage"
                :total-rows="totalRows"
                :per-page="perPage"
                v-model="currentPage"
                align="center"
                class="XDC-pagination"
                @change="pageChange"/>
        </div>
    </div>
</template>

<script>
import axios from 'axios'
import BigNumber from 'bignumber.js'
import store from 'store'

export default {
    name: 'App',
    data () {
        return {
            chainConfig: {},
            fields: [
                {
                    key: 'address',
                    label: 'Address',
                    sortable: false
                },
                {
                    key: 'name',
                    label: 'Name',
                    sortable: true
                },
                {
                    key: 'capacity',
                    label: 'Capacity',
                    sortable: true
                },
                {
                    key: 'latestSignedBlock',
                    label: 'Latest Signed Block',
                    sortable: true
                },
                {
                    key: 'status',
                    label: 'Status',
                    sortable: false
                },
                {
                    key: 'action',
                    label: '',
                    sortable: false
                }
            ],
            sortBy: 'capacity',
            sortDesc: true,
            isReady: false,
            account: '',
            voteActive: false,
            voteValue: 1,
            candidates: [],
            currentPage: this.$store.state.currentPage || 1,
            perPage: 20,
            totalRows: 0,
            tableCssClass: '',
            loading: false,
            hasProposed: false,
            hasResigned: false,
            isXDCnet: false,
            activeCandidates: 0,
            resignedMN: 0,
            slashedMN: 0,
            totalProposedNodes: 0,
            currentTable: 'masternodes'
        }
    },
    computed: {},
    watch: {},
    updated () {},
    created: async function () {
        let self = this
        let account
        self.isReady = !!self.web3
        let config = await self.appConfig()
        self.chainConfig = config.blockchain
        self.currentBlock = self.chainConfig.blockNumber

        try {
            if (self.isReady) {
                let contract = await self.getXDCValidatorInstance()
                if (store.get('address')) {
                    account = store.get('address').toLowerCase()
                } else {
                    account = this.$store.state.walletLoggedIn
                        ? this.$store.state.walletLoggedIn : await self.getAccount()
                }
                if (account && contract) {
                    self.isXDCnet = true
                }
            }
        } catch (error) {
            console.log(error)
        }
        self.getDataFromApi()
    },
    mounted () { },
    methods: {
        watch: async function () {
            let contract = await self.getXDCValidatorInstance()
            const allEvents = contract.allEvents({
                fromBlock: self.blockNumber,
                toBlock: 'latest'
            })

            allEvents.watch((err, res) => {
                if (err || !(res || {}).args) {
                    console.error(err, res)
                } else {
                    console.log(res)
                }
            })
        },
        getTableCssClass: function () {
            let cssClass = ''

            if (!this.candidates.length) {
                cssClass += ' XDC-table--candidates-empty'
            }

            cssClass += this.loading ? ' XDC-table--loading' : ''

            this.tableCssClass = cssClass
        },
        onRowClick (address) {
            if (this.isXDCnet) {
                this.$router.push({ path: `/voting/${address}` })
            } else {
                const toastMessage = 'You can not vote at the moment. Please log in first.'
                this.$toasted.show(toastMessage, {
                    type: 'info',
                    delay: '5000'
                })
            }
        },
        getColor (latestSignedBlock, currentBlock) {
            let result
            switch (true) {
            case latestSignedBlock >= (currentBlock - 100):
                result = 'cyan'
                break
            case latestSignedBlock < (currentBlock - 100) &&
                latestSignedBlock >= (currentBlock - 200):
                result = 'yellow'
                break
            case latestSignedBlock < (currentBlock - 200):
                result = 'pink'
                break
            default:
                result = ''
            }
            return result
        },
        async getDataFromApi () {
            const self = this
            try {
                self.loading = true
                const params = {
                    page: self.currentPage,
                    limit: self.perPage,
                    sortBy: self.sortBy,
                    sortDesc: self.sortDesc
                }
                const query = self.serializeQuery(params)

                let candidates = await axios.get('/api/candidates/masternodes' + '?' + query)
                let items = []

                candidates.data.items.map(async (candidate, index) => {
                    items.push({
                        address: candidate.candidate,
                        owner: candidate.owner.toLowerCase(),
                        status: candidate.status,
                        isMasternode: candidate.isMasternode,
                        isPenalty: candidate.isPenalty,
                        name: candidate.name || 'XinFin MasterNode',
                        cap: new BigNumber(candidate.capacity).div(10 ** 18).toNumber(),
                        latestSignedBlock: candidate.latestSignedBlock,
                        rank: candidate.rank
                    })
                })
                self.candidates = items

                self.activeCandidates = candidates.data.activeCandidates
                self.totalRows = candidates.data.activeCandidates
                self.resignedMN = candidates.data.totalResigned
                self.totalProposedNodes = candidates.data.totalProposed
                self.slashedMN = candidates.data.totalSlashed

                self.loading = false
                self.getTableCssClass()
            } catch (e) {
                self.loading = false
                console.log(e)
            }
        },
        pageChange (page) {
            this.$store.state.currentPage = page
            this.currentPage = page
            this.loadDataTables(this.currentTable)
            window.scrollTo(0, 320)
        },
        sortingChange (obj) {
            this.sortBy = obj.sortBy
            this.sortDesc = obj.sortDesc
            this.loadDataTables(this.currentTable)
        },
        async getSlashedMNs () {
            const self = this
            try {
                self.loading = true
                const params = {
                    page: self.currentPage,
                    limit: self.perPage,
                    sortBy: self.sortBy,
                    sortDesc: self.sortDesc
                }
                const query = self.serializeQuery(params)

                let candidates = await axios.get('/api/candidates/slashedMNs' + '?' + query)
                let items = []
                candidates.data.items.map(async (candidate, index) => {
                    items.push({
                        address: candidate.candidate,
                        owner: candidate.owner.toLowerCase(),
                        status: candidate.status,
                        isMasternode: candidate.isMasternode,
                        isPenalty: candidate.isPenalty,
                        name: candidate.name || 'XinFin MasterNode',
                        cap: new BigNumber(candidate.capacity).div(10 ** 18).toNumber(),
                        latestSignedBlock: candidate.latestSignedBlock
                    })
                })
                self.candidates = items

                self.totalRows = candidates.data.total

                self.loading = false
                self.getTableCssClass()
            } catch (e) {
                self.loading = false
                console.log(e)
            }
        },
        async getProposedMNs () {
            const self = this
            try {
                self.loading = true

                const params = {
                    page: self.currentPage,
                    limit: self.perPage,
                    sortBy: self.sortBy,
                    sortDesc: self.sortDesc
                }
                const query = self.serializeQuery(params)

                let candidates = await axios.get('/api/candidates/proposedMNs' + '?' + query)
                let items = []
                candidates.data.items.map(async (candidate, index) => {
                    items.push({
                        address: candidate.candidate,
                        owner: candidate.owner.toLowerCase(),
                        status: candidate.status,
                        isMasternode: candidate.isMasternode,
                        isPenalty: candidate.isPenalty,
                        name: candidate.name || 'XinFin MasterNode',
                        cap: new BigNumber(candidate.capacity).div(10 ** 18).toNumber(),
                        latestSignedBlock: candidate.latestSignedBlock
                    })
                })
                self.candidates = items

                self.totalRows = candidates.data.total

                self.loading = false
                self.getTableCssClass()
            } catch (e) {
                self.loading = false
                console.log(e)
            }
        },
        async getResignedMNs () {
            const self = this
            try {
                self.loading = true
                const params = {
                    page: self.currentPage,
                    limit: self.perPage,
                    sortBy: self.sortBy,
                    sortDesc: self.sortDesc
                }
                const query = self.serializeQuery(params)

                let candidates = await axios.get('/api/candidates/resignedMNs' + '?' + query)
                let items = []
                candidates.data.items.map(async (candidate, index) => {
                    items.push({
                        address: candidate.candidate,
                        owner: candidate.owner.toLowerCase(),
                        status: candidate.status,
                        isMasternode: candidate.isMasternode,
                        isPenalty: candidate.isPenalty,
                        name: candidate.name || 'XinFin MasterNode',
                        cap: new BigNumber(candidate.capacity).div(10 ** 18).toNumber(),
                        latestSignedBlock: candidate.latestSignedBlock
                    })
                })
                self.candidates = items

                self.totalRows = candidates.data.total

                self.loading = false
                self.getTableCssClass()
            } catch (e) {
                self.loading = false
                console.log(e)
            }
        },
        changeTable (tableName) {
            this.currentPage = 1
            this.$store.state.currentPage = 1
            if (this.currentTable !== tableName) {
                this.currentTable = tableName
                this.loadDataTables(tableName)
            }
        },
        loadDataTables (tableName) {
            switch (tableName) {
            case 'masternodes':
                this.getDataFromApi()
                break
            case 'slashed':
                this.getSlashedMNs()
                break
            case 'proposed':
                this.getProposedMNs()
                break
            case 'resigned':
                this.getResignedMNs()
                break
            default:
                this.getDataFromApi()
                break
            }
        }
    }
}
</script>
