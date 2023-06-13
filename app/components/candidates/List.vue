<template>
    <div class="main-content">
        <div
            class="container">
            <div class="row">
                <div class="col-12">
                    <h4 class="h4 text-center mb-4">XDC Staking</h4>
                </div>
                <div class="col-md-6 col-lg-4">
                    <b-card class="XDC-card">
                        <h6 class="XDC-card__title">MasterNode / Total Nodes</h6>
                        <p class="XDC-card__text">
                            {{ activeCandidates }}/{{ activeCandidates+totalProposedNodes }}
                        </p>
                    </b-card>
                </div>
                <div class="col-md-6 col-lg-4">
                    <b-card class="XDC-card XDC-card">
                        <h6 class="XDC-card__title">Staked Amount</h6>
                        <p class="XDC-card__text">
                            {{ formatCurrencySymbol(formatBigNumber(toXDCNumber(chainConfig.XDCStakeAmount),2)) }}
                        </p>
                    </b-card>
                </div>
                <div class="col-md-6 col-lg-4">
                    <b-card class="XDC-card XDC-card">
                        <h6 class="XDC-card__title">Epoch / Block Number</h6>
                        <p class="XDC-card__text">
                            {{ Math.floor(chainConfig.blockNumber / chainConfig.epoch) + 1 }} / {{ chainConfig.blockNumber }}</p>
                    </b-card>
                </div>
                <!--<div
                    class="col-md-6 col-lg-3">
                    <b-card class="XDC-card XDC-card">
                        <h6 class="XDC-card__title">Avg. Staking ROI</h6>
                        <p class="XDC-card__text">
                            {{ averageStakingROI ? averageStakingROI + '%' : '-&#45;&#45;' }}</p>
                    </b-card>
                </div>
                <div
                    class="col-md-6 col-lg-3">
                    <b-card class="XDC-card XDC-card">
                        <h6 class="XDC-card__title">Avg. Owner ROI</h6>
                        <p class="XDC-card__text">
                            &lt;!&ndash; eslint-disable-next-line max-len &ndash;&gt;
                            {{ averageOwnerROI ? averageOwnerROI + '%' : '-&#45;&#45;' }}</p>
                    </b-card>
                </div>-->
            </div>
        </div>

        <div
            v-if="candidates.length <= 0"
            class="XDC-loading"/>
        <div
            v-else
            class="container">
            <b-card class="XDC-card xdc-p-none">
                <div class="XDC-custom-tab p-4">
                    <ul>
                        <li
                            v-if="activeCandidates !== 0"
                            :class="currentTable === 'masternodes' ? 'active' : ''"
                            @click="changeTable('masternodes')">Masternodes ({{ activeCandidates }})</li>
                        <li
                            v-if="slashedMN !== 0"
                            :class="currentTable === 'slashed' ? 'active' : ''"
                            @click="changeTable('slashed')">Slashed MNs ({{ slashedMN }})</li>
                        <li
                            v-if="totalProposedNodes !== 0"
                            :class="currentTable === 'proposed' ? 'active' : ''"
                            @click="changeTable('proposed')">Standby Nodes ({{ totalProposedNodes }})</li>
                        <li
                            v-if="resignedMN !== 0"
                            :class="currentTable === 'resigned' ? 'active' : ''"
                            @click="changeTable('resigned')">Resigned Nodes ({{ resignedMN }})</li>
                    </ul>
                </div>

                <b-pagination
                    v-if="mobileCheck && totalRows > 0 && totalRows > perPage"
                    :total-rows="totalRows"
                    :per-page="perPage"
                    v-model="currentPage"
                    align="center"
                    class="XDC-pagination"
                    @change="pageChange"/>
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
                            {{ data.item.address }}
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
                                :class="`float-left mr-2 ${(data.item.status !== 'STANDBY')
                                    ? ` XDC-status-dot XDC-status-dot--${getColor(
                                data.item.latestSignedBlock || '', currentBlock)}` : '' }`">
                                {{ data.item.latestSignedBlock }}
                            </span>
                        </div>
                    </template>

                    <template
                        slot="status"
                        slot-scope="data">
                        <div class="mt-2 mt-lg-0">
                            <span
                                :class="'XDC-chip '
                                    + (data.item.status === 'STANDBY' || data.item.status === 'MASTERNODE' ?
                                'XDC-chip--primary' : 'XDC-chip--accent') ">
                                {{ data.item.status.toUpperCase() }}
                            </span>
                        </div>
                    </template>

                    <!--<template
                        slot="action"
                        slot-scope="data">
                        <b-button
                            v-if="data.item.status === 'STANDBY' || data.item.status === 'MASTERNODE'"
                            variant="primary"
                            class="mt-3 mt-lg-0 vote-btn"
                            @click="onRowClick(data.item.address)">Vote</b-button>
                    </template>-->
                </b-table>
                <b-pagination
                    v-if="totalRows > 0 && totalRows > perPage"
                    :total-rows="totalRows"
                    :per-page="perPage"
                    v-model="currentPage"
                    align="center"
                    class="XDC-pagination"
                    @change="pageChange"/>
            </b-card>
        </div>
    </div>
</template>

<script>
import axios from 'axios'
import BigNumber from 'bignumber.js'
import store from 'store'
import Web3 from 'xdc3'

export default {
    name: 'App',
    data () {
        return {
            chainConfig: {},
            fields: [
                // { key: 'rank', label: 'Rank' },
                { key: 'address', label: 'Address', sortable: false },
                { key: 'name', label: 'Name', sortable: false },
                { key: 'capacity', label: 'Capacity', sortable: true },
                { key: 'latestSignedBlock', label: 'Latest Signed Block', sortable: true },
                { key: 'status', label: 'Status', sortable: false }
            ],
            sortBy: 'capacity',
            sortDesc: true,
            isReady: false,
            account: '',
            voteActive: false,
            voteValue: 1,
            candidates: [],
            currentPage: this.$store.state.currentPage || 1,
            perPage: 30,
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
            currentTable: 'masternodes',
            averageStakingROI: '',
            averageOwnerROI: '',
            currentBlock: ''
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
    created: async function () {
        let self = this
        self.isReady = !!self.web3
        const config = store.get('configMaster') || await self.appConfig()
        self.chainConfig = config.blockchain
        self.currentBlock = self.chainConfig.blockNumber
        console.log(self.chainConfig.XDCStakeAmount, 'chainConfig.XDCStakeAmountchainConfig.XDCStakeAmountchainConfig.XDCStakeAmount')

        try {
            if (self.isReady || window.web3) {
                if (window.web3 && window.web3.currentProvider &&
                    window.web3.currentProvider.isXDCWallet) {
                    const wjs = new Web3(window.web3.currentProvider)
                    await self.setupProvider('XDCwalletDapp', wjs)
                    self.account = await self.getAccount()
                    if (self.account.substring(0, 2) === '0x') {
                        self.account = 'xdc' + self.account.substring(2)
                    }
                    if (self.account) {
                        self.$store.state.address = self.account
                        store.set('address', self.account.toLowerCase())
                        store.set('network', 'XDCwalletDapp')
                        self.$bus.$emit('logged', 'user logged')
                    }
                } else {
                    self.account = store.get('address') ||
                    self.$store.state.address || await self.getAccount()
                }
                let contract
                contract = self.XDCValidator
                if (self.account && contract) {
                    self.isXDCnet = true
                }
            }
        } catch (error) {
            console.log(error)
        }
        self.getDataFromApi()
        // self.averageroi()
    },
    mounted () { },
    methods: {
        watch: async function () {
            let contract = await self.getXDCValidatorInstance()
            contract = self.XDCValidator
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

        toXDCNumber: (wei) => {
            BigNumber.config({ EXPONENTIAL_AT: [-100, 100] })

            const weiNumber = new BigNumber(wei.toString())
            const divided = 10 ** 18
            return weiNumber.dividedBy(divided)
            // web3.utils.fromWei(wei, 'ether')
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
                        name: candidate.name || 'XDC.Network',
                        cap: new BigNumber(candidate.capacity).div(10 ** 18).toNumber(),
                        latestSignedBlock: candidate.latestSignedBlock || 0,
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
                        name: candidate.name || 'XDC.Network',
                        cap: new BigNumber(candidate.capacity).div(10 ** 18).toNumber(),
                        latestSignedBlock: candidate.latestSignedBlock || 0
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
                        name: candidate.name || 'XDC.Network',
                        cap: new BigNumber(candidate.capacity).div(10 ** 18).toNumber(),
                        latestSignedBlock: '---' // candidate.latestSignedBlock
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
                        name: candidate.name || 'XDC.Network',
                        cap: new BigNumber(candidate.capacity).div(10 ** 18).toNumber(),
                        latestSignedBlock: candidate.latestSignedBlock || 0
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
        },
        async averageroi () {
            axios.get('/api/voters/averageroi')
                .then(result => {
                    if (result.data && result.data.averageStakingROI) {
                        this.averageStakingROI = result.data.averageStakingROI.toFixed(2)
                        this.averageOwnerROI = result.data.averageOwnerROI.toFixed(2)
                    }
                })
                .catch(error => {
                    console.log(error)
                    this.$toasted.show(error, { type: 'error' })
                })
        }
    }
}
</script>
