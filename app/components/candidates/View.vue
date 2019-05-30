<template>
    <div>
        <div
            v-if="!isCandidate"
            class="row">
            <div
                class="XDC-empty col-12">
                <i class="tm-notice XDC-empty__icon"/>
                <p class="XDC-empty__description">This is not a candidate</p>
            </div>
        </div>
        <div
            v-else>
            <div class="container section section--candidate">
                <div class="row">
                    <div class="col-12">
                        <div class="section-title">
                            <i class="tm-flag color-yellow" />
                            <span>{{ candidate.name }}</span>

                            <router-link
                                v-if="account === candidate.owner"
                                :to="'/candidate/' + candidate.address + '/update'"
                                class="edit-link">
                                <i class="tm-edit ml-2 mr-0" />
                            </router-link>
                            <span class="text-truncate section-title__description">{{ candidate.address }}</span>
                            <ul class="list-inline social-links">
                                <li
                                    v-for="(value, key) in candidate.socials"
                                    :key="key"
                                    class="list-inline-item social-links__item">
                                    <a
                                        :href="value"
                                        class="social-links__link">
                                        <i :class="'social-links__icon tm-' + key" />
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                <b-card
                    :class="'XDC-card XDC-card--animated XDC-card--candidate'
                    + (loading ? ' XDC-loading' : '')">
                    <div class="row m-md-0">
                        <div
                            class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 XDC-info text-truncate">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span class="XDC-info__text">Owner</span>
                            </p>
                            <p class="XDC-info__description color-cyan">
                                <router-link
                                    :to="'/voter/' + candidate.owner"
                                    class="text-truncate">
                                    {{ candidate.owner }}
                                </router-link>
                            </p>
                        </div>
                        <div class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span class="XDC-info__text">Latest Signed Block</span>
                            </p>
                            <p class="XDC-info__description">
                                <span
                                    :class="`XDC-status-dot float-left mr-2 XDC-status-dot--${getColor(
                                    candidate.latestSignedBlock || 0, currentBlock)}`">
                                    {{ formatNumber(candidate.latestSignedBlock) }}
                                </span>
                            </p>
                        </div>
                        <div class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span class="XDC-info__text">Stake</span>
                            </p>
                            <p
                                id="XDC-info__description--cap"
                                class="XDC-info__description">
                                {{ formatCurrencySymbol(formatBigNumber(candidate.cap, 3)) }}
                                <b-tooltip
                                    v-if="checkLongNumber(candidate.cap)"
                                    ref="tooltip"
                                    target="XDC-info__description--cap">
                                    {{ formatCurrencySymbol(formatBigNumber(candidate.cap, 6)) }}
                                </b-tooltip>
                            </p>
                        </div>
                        <div
                            v-if="isReady"
                            class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-arrow-up XDC-info__icon" />
                                <span class="XDC-info__text">You voted</span>
                            </p>
                            <p
                                id="XDC-info__description--you-voted"
                                class="XDC-info__description">
                                {{ formatCurrencySymbol(formatNumber(candidate.voted)) }}
                                <b-tooltip
                                    v-if="checkLongNumber(candidate.voted)"
                                    ref="tooltip"
                                    target="XDC-info__description--you-voted">
                                    {{ formatCurrencySymbol(formatBigNumber(candidate.voted, 6)) }}
                                </b-tooltip>
                            </p>
                        </div>
                        <div
                            class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span class="XDC-info__text">Recent Reward</span>
                            </p>
                            <p
                                id="XDC-info__description--you-rewarded"
                                class="XDC-info__description">
                                {{ formatCurrencySymbol(formatNumber(recentReward)) }}
                                <b-tooltip
                                    v-if="checkLongNumber(candidate.rewarded)"
                                    ref="tooltip"
                                    target="XDC-info__description--you-rewarded">
                                    {{ formatCurrencySymbol(formatBigNumber(candidate.rewarded, 6)) }}
                                </b-tooltip>
                            </p>
                        </div>
                        <div
                            class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 m-xl-0 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span
                                    class="XDC-info__text">
                                    Status
                                </span>
                            </p>
                            <p
                                :class="{ 'color-cyan': candidate.status === 'MASTERNODE',
                                          'color-pink': candidate.status === 'SLASHED',
                                          'color-pink': candidate.status === 'RESIGNED' }"
                                class="XDC-info__description">
                                {{ candidate.status }}
                            </p>
                        </div>
                        <div
                            v-if="isReady"
                            class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 m-xl-0 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span class="XDC-info__text">Balance</span>
                            </p>
                            <p
                                id="XDC-info__description--balance"
                                class="XDC-info__description">
                                {{ formatCurrencySymbol(formatBigNumber(candidate.balance, 3)) }}
                                <b-tooltip
                                    v-if="checkLongNumber(candidate.balance)"
                                    ref="tooltip"
                                    target="XDC-info__description--balance">
                                    {{ formatCurrencySymbol(formatBigNumber(candidate.balance, 6)) }}
                                </b-tooltip>
                            </p>
                        </div>
                        <div class="col-12 col-md-6 col-lg-6 col-xl-4 order-md-1 order-lg-0 m-xl-0 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span class="XDC-info__text">Hardware</span>
                            </p>
                            <p class="XDC-info__description">
                                {{ candidate.hardwareInfo }}
                            </p>
                        </div>
                        <div
                            v-for="(value, key) in candidate.dataCenterInfo"
                            :key="key"
                            class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 m-xl-0 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span class="XDC-info__text">{{ key }}</span>
                            </p>
                            <p class="XDC-info__description">
                                {{ value }}
                            </p>
                        </div>
                        <div class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 m-xl-0 XDC-info">
                            <p class="XDC-info__title">
                                <i class="tm-dot XDC-info__icon" />
                                <span class="XDC-info__text">KYC</span>
                            </p>
                            <p class="XDC-info__description">
                                <a
                                    v-if="Boolean(KYC.status)"
                                    :href="KYC.url"
                                    target="_blank">Check here</a>
                                <template v-else><a href="/setting">Login to Get KYC</a></template>
                            </p>
                        </div>
                    </div>
                </b-card>
                <div
                    class="buttons text-right">
                    <b-button
                        v-if="'0x' + candidate.owner.substring(3) === account && candidate.status !== 'RESIGNED'"
                        :to="`/resign/${candidate.address}`"
                        variant="secondary">Resign</b-button>

                </div>
            </div>
            <!-- <div
                v-if="candidate.status !== 'RESIGNED' && candidate.nodeId"
                class="container section section--hardware">
                <div
                    class="row">
                    <div
                        v-if="loadedCPU"
                        class="col-12 col-lg-6">
                        <h3 class="section-title">
                            <i class="tm-cpu color-pink" />
                            <span>CPUs</span>
                        </h3>
                        <chart
                            :host="candidate.nodeId"
                            data-type="cpu"
                            class="mb-5" />
                    </div>
                    <div
                        v-if="loadedMEM"
                        class="col-12 col-lg-6">
                        <h3 class="section-title">
                            <i class="tm-memory color-orange" />
                            <span>Memory</span>
                        </h3>
                        <chart
                            :host="candidate.nodeId"
                            data-type="memory" />
                    </div>
                </div>
            </div> -->
            <!-- <div
                :class="'container section section--mnrewards'
                + (rewardLoading ? ' XDC-loading' : '')">
                <div class="row">
                    <div class="col-12">
                        <h3 class="section-title">
                            <i class="tm-gift color-purple" />
                            <span>Masternode Rewards</span>
                            <span class="text-truncate section-title__description">
                                Estimated Reward for Masternode</span>
                        </h3>
                    </div>
                </div>
                <b-table
                    :items="mnRewards"
                    :fields="mnRewardsFields"
                    :sort-by.sync="mnRewardsSortBy"
                    :sort-desc.sync="mnRewardsSortDesc"
                    :per-page="mnRewardsPerPage"
                    :show-empty="true"
                    :class="`XDC-table XDC-table--mnrewards${rewardLoading ? ' loading' : ''}`"
                    empty-text="There are no rewards to show"
                    stacked="md" >

                    <template
                        slot="checkpoint"
                        slot-scope="data">{{ data.item.checkpoint }}
                    </template>

                    <template
                        slot="reward"
                        slot-scope="data">
                        {{ formatCurrencySymbol(formatNumber(data.item.reward)) }}
                    </template>

                    <template
                        slot="createdAt"
                        slot-scope="data">
                        <span :id="`timestamp__${data.index}`">{{ data.item.createdAt }}</span>
                        <b-tooltip :target="`timestamp__${data.index}`">
                            {{ data.item.dateTooltip }}
                        </b-tooltip>
                    </template>

                </b-table>

                <b-pagination
                    v-if="mnRewardsTotalRows > 0 && mnRewardsTotalRows > mnRewardsPerPage"
                    :total-rows="mnRewardsTotalRows"
                    :per-page="mnRewardsPerPage"
                    v-model="mnRewardsCurrentPage"
                    align="center"
                    class="XDC-pagination"
                    @change="rewardPageChange" />
            </div> -->
            <div
                :class="'container section section-voters'
                + (voterLoading ? ' XDC-loading' : '')">
                <div class="row">
                    <div class="col-12">
                        <h3 class="section-title">
                            <i class="tm-arrow-up color-pink" />
                            <span>Owner</span>
                            <span class="text-truncate section-title__description">
                                People who voted for this candidate</span>
                        </h3>
                    </div>
                </div>
                <b-table
                    :items="voters"
                    :fields="voterFields"
                    :per-page="voterPerPage"
                    :show-empty="true"
                    :class="`XDC-table XDC-table--voted${voterLoading ? ' loading' : ''}`"
                    empty-text="There are no voters to show"
                    stacked="md"
                    @sort-changed="sortingChangeVoters" >

                    <template
                        slot="id"
                        slot-scope="data">{{ data.item.id }}
                    </template>

                    <template
                        slot="address"
                        slot-scope="data">
                        <router-link
                            :to="'/voter/' + data.item.address"
                            class="text-truncate">
                            {{ data.item.address }}
                        </router-link>
                    </template>

                    <template
                        slot="capacityNumber"
                        slot-scope="data">{{ formatCurrencySymbol(formatNumber(data.item.cap)) }}
                    </template>
                </b-table>

                <b-pagination
                    v-if="voterTotalRows > 0 && voterTotalRows > voterPerPage"
                    :total-rows="voterTotalRows"
                    :per-page="voterPerPage"
                    v-model="voterCurrentPage"
                    align="center"
                    class="XDC-pagination"
                    @change="voterPageChange" />
            </div>
            <div
                :class="'container section section--txs'
                + (txLoading ? ' XDC-loading' : '')">
                <div class="row">
                    <div class="col-12">
                        <h3 class="section-title">
                            <i class="tm-time color-purple" />
                            <span>Transactions</span>
                            <span class="text-truncate section-title__description">
                                All transactions of this candidate</span>
                        </h3>
                    </div>
                </div>
                <b-table
                    :items="transactions"
                    :fields="txFields"
                    :per-page="txPerPage"
                    :show-empty="true"
                    :class="`XDC-table XDC-table--transactions${txLoading ? ' loading' : ''}`"
                    empty-text="There are no transactions to show"
                    stacked="md"
                    @sort-changed="sortingChangeTxes" >

                    <template
                        slot="id"
                        slot-scope="data">{{ data.item.id }}
                    </template>

                    <template
                        slot="voter"
                        slot-scope="data">
                        <router-link
                            :to="'/voter/' + data.item.voter"
                            class="text-truncate">
                            {{ data.item.voter }}
                        </router-link>
                    </template>

                    <template
                        slot="event"
                        slot-scope="data">
                        <span :class="'fw-600 ' + getEventClass(data.item.event)">{{ data.item.event }}</span>
                    </template>

                    <template
                        slot="capacity"
                        slot-scope="data">
                        {{ isNaN(data.item.cap) ? '---' : formatCurrencySymbol(data.item.cap) }}
                    </template>

                    <template
                        slot="createdAt"
                        slot-scope="data">
                        <span :id="`timestamp__${data.index}`">{{ data.item.createdAt }}</span>
                        <b-tooltip :target="`timestamp__${data.index}`">
                            {{ data.item.dateTooltip }}
                        </b-tooltip>
                    </template>

                    <template
                        slot="action"
                        slot-scope="data">
                        <a
                            v-b-tooltip.hover.right
                            :href="`${config.explorerUrl}/txs/${data.item.tx}`"
                            title="View on xdcscan"
                            target="_blank">
                            <i class="tm-eye" />
                            <span>View on xdcscan</span>
                        </a>
                    </template>
                </b-table>

                <b-pagination
                    v-if="txTotalRows > 0 && txTotalRows > txPerPage"
                    :total-rows="txTotalRows"
                    :per-page="txPerPage"
                    v-model="txCurrentPage"
                    align="center"
                    class="XDC-pagination"
                    @change="txPageChange"/>
            </div>
        </div>
    </div>
</template>
<script>
import axios from 'axios'
import BigNumber from 'bignumber.js'
import Chart from '../Chart.vue'
import moment from 'moment'
import store from 'store'
export default {
    name: 'App',
    components: {
        chart: Chart
    },
    data () {
        return {
            isReady: false,
            account: '',
            voteActive: false,
            voteValue: 1,
            unvoteValue: 1,
            recentReward: 0,
            config: {},
            voters: [],
            transactions: [],
            mnRewards: [],
            candidate: {
                address: this.$route.params.address.toLowerCase(),
                name: '',
                balance: '',
                status: '',
                cap: 0,
                latestBlock: '',
                latestSignedBlock: 0,
                rewarded: 0,
                hardwareInfo: '',
                dataCenterInfo: {},
                socials: {},
                voted: 0,
                slashedTimes: 0,
                rank: ''
            },
            mnRewardsFields: [
                {
                    key: 'epoch',
                    label: 'Epoch',
                    sortable: false
                },
                {
                    key: 'signNumber',
                    label: 'Sign Number',
                    sortable: false
                },
                {
                    key: 'status',
                    label: 'Status',
                    sortable: false
                },
                {
                    key: 'reward',
                    label: 'Reward',
                    sortable: false
                },
                {
                    key: 'createdAt',
                    label: 'Age',
                    sortable: false
                }
            ],
            mnRewardsCurrentPage: 1,
            mnRewardsSortBy: 'epoch',
            mnRewardsPerPage: 10,
            mnRewardsSortDesc: true,
            mnRewardsTotalRows: 0,
            voterFields: [
                {
                    key: 'address',
                    label: 'Address',
                    sortable: false
                },
                {
                    key: 'capacityNumber',
                    label: 'Capacity',
                    sortable: true
                }
            ],
            voterSortBy: 'capacityNumber',
            voterSortDesc: true,
            voterCurrentPage: 1,
            voterPerPage: 10,
            voterTotalRows: 0,
            txFields: [
                {
                    key: 'voter',
                    label: 'Voter',
                    sortable: true
                },
                {
                    key: 'event',
                    label: 'Event',
                    sortable: true
                },
                {
                    key: 'capacity',
                    label: 'Capacity',
                    sortable: true
                },
                {
                    key: 'createdAt',
                    label: 'Age',
                    sortable: false
                },
                {
                    key: 'action',
                    label: '',
                    sortable: false
                }
            ],
            txSortBy: 'createdAt',
            txSortDesc: true,
            txCurrentPage: 1,
            txPerPage: 10,
            txTotalRows: 0,
            loading: false,
            rewardLoading: false,
            voterLoading: false,
            txLoading: false,
            chartLoading: false,
            cpu0Series: [],
            isXDCnet: false,
            currentBlock: null,
            loadedCPU: true,
            loadedMEM: true,
            isCandidate: true,
            currentTab: '',
            KYC: {
                url: '',
                status: false
            }
        }
    },
    computed: {
        sortedVoters: function () {
            return this.voters.slice().sort(function (a, b) {
                return b.cap - a.cap
            })
        }
    },
    watch: {
        $route (to, from) {
            this.candidate.address = to.params.address.toLowerCase()
            this.getCandidateData().then(() => {
                this.getCandidateVoters()
                this.getCandidateTransactions()
                this.getCandidateRewards()
            }).catch((error) => { console.log(error) })
        }
    },
    created: async function () {
        let self = this
        self.config = await this.appConfig()
        self.currentBlock = self.config.blockchain.blockNumber
        self.isReady = !!self.web3
        try {
            if (self.isReady) {
                let contract = self.XDCValidator.deployed()
                if (store.get('address')) {
                    self.account = store.get('address').toLowerCase()
                } else {
                    self.account = this.$store.state.walletLoggedIn
                        ? this.$store.state.walletLoggedIn : self.getAccount()
                }
                if (await self.account && await contract) {
                    self.isXDCnet = true
                }
            }
            this.$bus.$on('CPUResult', function (res) {
                self.loadedCPU = res
            })
            this.$bus.$on('MEMResult', function (res) {
                self.loadedMEM = res
            })
        } catch (error) {
            console.log(error)
        }
        await self.getCandidateData()
        self.getCandidateVoters()
        self.getCandidateTransactions()
        self.getCandidateRewards()
    },
    mounted () {},
    methods: {
        getEventClass (event) {
            let clazz = ''
            if (event === 'Unvote' || event === 'Resign') {
                clazz = 'color-pink'
            }
            return clazz
        },
        getDate (date) {
            return date
        },
        async getCandidateData () {
            let self = this
            try {
                let address = self.candidate.address
                self.loading = true
                const candidatePromise = axios.get(`/api/candidates/${address}`)
                // Get candidate's information
                let c = await candidatePromise
                if (c.data) {
                    let data = c.data
                    self.isCandidate = data.candidate
                    self.candidate.name = data.name ? data.name : 'XinFin MasterNode'
                    self.candidate.status = data.status
                    self.candidate.nodeId = data.nodeId
                    self.candidate.monitor = (data.nodeId) ? 'ON' : 'OFF'
                    self.candidate.owner = data.owner
                    self.candidate.cap = new BigNumber(data.capacity).div(10 ** 18).toNumber()
                    self.candidate.rewarded = 0
                    self.candidate.latestBlock = '0'
                    self.candidate.latestSignedBlock = data.latestSignedBlock
                    self.candidate.hardwareInfo = data.hardware || 'N/A'
                    self.candidate.dataCenterInfo = {
                        name: (data.dataCenter || {}).name || 'N/A',
                        location: (data.dataCenter || {}).location || 'N/A'
                    }
                    self.candidate.socials = data.socials
                    self.candidate.slashedTimes = data.slashedTimes
                    self.candidate.rank = data.rank
                }
                if (self.web3) {
                    let youVoted = new BigNumber(0)
                    self.web3.eth.getBalance(self.candidate.address, function (a, b) {
                        self.candidate.balance = new BigNumber(b).div(10 ** 18)
                        if (a) {
                            console.log('got an error', a)
                        }
                    })
                    console.log(address, 'address')
                    self.KYC.status = await this.getKYCStatus('0x' + address.substring(3))
                    if (self.KYC.status) self.KYC.url = `https://kycdocs.xinfin.network/ipfs/${self.KYC.status}`
                    if (self.account) {
                        try {
                            let contract = await self.getXDCValidatorInstance()
                            youVoted = await contract.getVoterCap(address, self.account)
                            self.candidate.cap = await contract.getCandidateCap(address).div(1e18).toNumber()
                        } catch (e) {}
                    }
                    self.candidate.voted = youVoted.div(10 ** 18).toNumber()
                }
                self.loading = false
            } catch (e) {
                self.loading = false
                console.log(e)
            }
        },
        async getCandidateRewards () {
            try {
                const self = this
                const address = self.candidate.address
                // Masternode reward table
                self.rewardLoading = true
                const params = {
                    page: self.mnRewardsCurrentPage,
                    limit: self.mnRewardsPerPage
                }
                let mnRewards = await axios.get(
                    `/api/candidates/${address}/${self.candidate.owner}/getRewards?${self.serializeQuery(params)}`
                )
                let items = []
                mnRewards.data.items.map((r) => {
                    const reward = !isNaN(r.masternodeReward || 0)
                        ? new BigNumber(r.masternodeReward || 0).toFixed(6) : r.masternodeReward
                    items.push({
                        epoch: r.epoch,
                        signNumber: r.signNumber ? r.signNumber : 0,
                        reward: reward,
                        createdAt: r.rewardTime ? moment(r.rewardTime).fromNow() : 'N/A',
                        dateTooltip: moment(r.rewardTime).format('lll'),
                        status: r.status
                    })
                })
                self.mnRewards = items

                self.mnRewardsTotalRows = mnRewards.data.total
                self.rewardLoading = false
            } catch (error) {
                self.rewardLoading = false
                console.log(error)
            }
        },
        async getCandidateVoters () {
            try {
                const self = this
                const address = self.candidate.address
                self.voterLoading = true
                const params = {
                    page: self.voterCurrentPage,
                    limit: self.voterPerPage,
                    sortBy: self.voterSortBy,
                    sortDesc: self.voterSortDesc
                }
                const voterPromise = axios.get(`/api/candidates/${address}/voters?${self.serializeQuery(params)}`)
                // Voter table
                let voters = await voterPromise
                let items = []
                voters.data.items.map((v, idx) => {
                    items.push({
                        address: v.voter,
                        cap: new BigNumber(v.capacity).div(10 ** 18).toNumber()
                    })
                })
                self.voters = items
                self.voterTotalRows = voters.data.total
                self.voterLoading = false
            } catch (error) {
                self.voterLoading = false
                console.log(error)
            }
        },
        async getCandidateTransactions () {
            try {
                const self = this
                const address = self.candidate.address
                self.txLoading = true
                const params = {
                    page: self.txCurrentPage,
                    limit: self.txPerPage,
                    sortBy: self.txSortBy,
                    sortDesc: self.txSortDesc
                }
                const txPromise = axios.get(`/api/transactions/candidate/${address}?${self.serializeQuery(params)}`)
                // Get transaction table
                let txs = await txPromise
                let items = []
                txs.data.items.map((tx, idx) => {
                    items.push({
                        tx: tx.tx,
                        voter: tx.voter,
                        candidate: tx.candidate,
                        event: tx.event,
                        cap: new BigNumber(tx.capacity).div(10 ** 18).toNumber(),
                        createdAt: moment(tx.createdAt).fromNow(),
                        dateTooltip: moment(tx.createdAt).format('lll')
                    })
                })
                self.transactions = items
                self.txTotalRows = txs.data.total
                self.txLoading = false
            } catch (error) {
                self.txLoading = false
                console.log(error)
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
        txPageChange (val) {
            if (this.txCurrentPage !== val) {
                this.txCurrentPage = val
                this.getCandidateTransactions()
            }
        },
        voterPageChange (val) {
            if (this.voterCurrentPage !== val) {
                this.voterCurrentPage = val
                this.getCandidateVoters()
            }
        },
        rewardPageChange (val) {
            if (this.mnRewardsCurrentPage !== val) {
                this.mnRewardsCurrentPage = val
                if (this.currentTab !== '') {
                    this.getSlashedData(this.currentTab)
                } else this.getCandidateRewards()
            }
        },
        sortingChangeVoters (obj) {
            this.voterSortBy = obj.sortBy
            this.voterSortDesc = obj.sortDesc
            this.getCandidateVoters()
        },
        sortingChangeTxes (obj) {
            this.txSortBy = obj.sortBy
            this.txSortDesc = obj.sortDesc
            this.getCandidateTransactions()
        },
        filterSlash (filterName) {
            this.mnRewardsCurrentPage = 1
            this.$store.state.mnRewardsCurrentPage = 1
            if (this.currentTab !== filterName) {
                this.currentTab = filterName
                this.getSlashedData(filterName)
            }
        },
        async getSlashedData (filterName) {
            try {
                const self = this
                const address = self.candidate.address

                self.rewardLoading = true
                const params = {
                    filterBy: filterName,
                    page: self.mnRewardsCurrentPage,
                    limit: self.mnRewardsPerPage
                }
                let slashedList = await axios.get(
                    `/api/candidates/${address}/slashedFilter?${self.serializeQuery(params)}`
                )
                let items = []

                slashedList.data.items.map((r) => {
                    const reward = !isNaN(r.masternodeReward || 0)
                        ? new BigNumber(r.masternodeReward || 0).toFixed(6) : r.masternodeReward
                    items.push({
                        epoch: r.epoch,
                        signNumber: r.signNumber ? r.signNumber : 0,
                        reward: reward,
                        createdAt: r.rewardTime ? moment(r.rewardTime).fromNow() : 'N/A',
                        dateTooltip: moment(r.rewardTime).format('lll'),
                        status: r.status
                    })
                })
                self.mnRewards = items

                self.mnRewardsTotalRows = slashedList.data.total
                self.rewardLoading = false
            } catch (error) {
                self.rewardLoading = false
                console.log(error)
            }
        },
        async getKYCStatus (address) {
            const contract = await this.getXDCValidatorInstance()
            const getKYC = await contract.getLatestKYC.call(address)
            console.log(getKYC)
            return getKYC
            // const KYCString = await contract.KYCString.call(address)
            // const isHashFound = await contract.getHashCount.call(address)
            // console.log('hash found ??>>>>>>>>>>>>>>>>>>>>>>', new BigNumber(isHashFound).toNumber())

            // if (new BigNumber(isHashFound).toNumber()) {

            // }
        }
    }
}
</script>
