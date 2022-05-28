<template>
    <div>
        <div
            v-if="isCandidate"
            class="XDC-header">
            <div class="container">
                <div class="XDC-header-block">
                    <div class="XDC-header-block-left">
                        <div>
                            <i class="tm-wallet XDC-header__icon" />
                        </div>
                        <div>
                            <h4 class="h4 color-black">{{ candidate.name }}
                                <router-link
                                    v-if="account === candidate.owner"
                                    :to="'/candidate/' + candidate.address + '/update'"
                                    class="edit-link">
                                    <i class="tm-edit ml-2 mr-0" />
                                </router-link>
                            </h4>
                            <p>
                                <router-link
                                    :to="'/voter/' + candidate.owner"
                                    class="text-truncate">
                                    {{ candidate.owner }}
                                </router-link>
                                <ul class="list-inline social-links">
                                    <li
                                        v-for="(value, key) in candidate.socials"
                                        :key="key"
                                        class="list-inline-item social-links__item">
                                        <a
                                            v-if="value !== ''"
                                            :href="value"
                                            target="_blank"
                                            class="social-links__link">
                                            <i :class="'social-links__icon tm-' + key" />
                                        </a>
                                    </li>
                                </ul>
                            </p>

                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="main-content container">
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
                <b-row
                    class="m-0">
                    <div
                        class="col-12 col-md-4 col-lg-4">
                        <b-card
                            :class="'XDC-card XDC-card--lighter XDC-card--candidate'
                            + (loading ? ' XDC-loading' : '')">
                            <div class="XDC-detail">
                                <div class="XDC-detail-section">
                                    <div class="XDC-detail-label">Capacity</div>
                                    <div class="XDC-detail-value-big">{{ formatCurrencySymbol(formatBigNumber(candidate.cap, 3)) }}</div>
                                </div>

                                <div class="XDC-detail-section">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <div class="XDC-detail-label">Est. Owner ROI</div>
                                            <div class="XDC-detail-value">{{ mnROI ? mnROI + '%' : '---' }}</div>
                                        </div>
                                        <div>
                                            <div class="XDC-detail-label text-right">APR</div>
                                            <div class="XDC-detail-value">
                                                {{ candidate.status === 'MASTERNODE' ? '10.00 %' : '8.00 %' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <hr>
                                <div class="XDC-detail-section d-flex justify-content-between">
                                    <div class="XDC-detail-label">Status</div>
                                    <div class="XDC-detail-value-small">
                                        <p
                                            :class="{ 'color-cyan': candidate.status === 'MASTERNODE',
                                                      'color-pink': candidate.status === 'SLASHED',
                                                      'color-pink': candidate.status === 'RESIGNED' }"
                                            class="XDC-info__description">
                                            {{ candidate.status }}
                                        </p>
                                    </div>
                                </div>
                                <div class="XDC-detail-section d-flex justify-content-between">
                                    <div class="XDC-detail-label">Hardware</div>
                                    <div class="XDC-detail-value-small">
                                        <span
                                            :class="XDC-info__description">
                                            {{ candidate.hardwareInfo }}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    v-for="(value, key) in candidate.dataCenterInfo"
                                    :key="key"
                                    class="XDC-detail-section d-flex justify-content-between XDC-info">
                                    <div class="XDC-info__title">
                                        <span class="XDC-info__text XDC-detail-label">{{ key }}</span>
                                    </div>
                                    <div class="XDC-detail-value-small">
                                        <span
                                            :class="XDC-info__description">
                                            {{ value }}
                                        </span>
                                    </div>
                                </div>
                                <div class="XDC-detail-section d-flex justify-content-between">
                                    <div class="XDC-detail-label">KYC</div>
                                    <div class="XDC-detail-value-small">
                                        <span
                                            :class="XDC-info__description">
                                            <a
                                                v-if="Boolean(KYC.status)"
                                                :href="KYC.url"
                                                target="_blank">Check here</a>
                                            <template v-else><a href="/setting">Login to Get KYC</a></template>
                                        </span>
                                    </div>
                                </div>
                                <!-- <div
                                    v-for="(value, key) in candidate.dataCenterInfo"
                                    :key="key"
                                    class="col-12 order-md-1 order-lg-0 XDC-info">
                                    <p class="XDC-info__title">
                                        <span class="XDC-info__text">{{ key }}</span>
                                    </p>
                                    <p class="XDC-info__description">
                                        {{ value }}
                                    </p>
                                </div> -->
                                <!-- <div
                                    v-for="(value, key) in candidate.dataCenterInfo"
                                    :key="key"
                                    class="col-12 XDC-info">
                                    <p class="XDC-info__title">
                                        <span class="XDC-info__text">{{ key }}</span>
                                    </p>
                                    <p class="XDC-info__description">
                                        {{ value }}
                                    </p>
                                </div> -->
                                <div class="XDC-detail-section d-flex justify-content-between">
                                    <div class="XDC-detail-label">Latest Signed Block</div>
                                    <div class="XDC-detail-value-small">
                                        <span
                                            :class="`float-left mr-2 XDC-status-dot&#45;&#45;${getColor(
                                            candidate.latestSignedBlock || 0, currentBlock)}`">
                                            {{ formatNumber(candidate.latestSignedBlock) }}
                                        </span>
                                    </div>
                                </div>
                                <!-- <div class="XDC-detail-section d-flex justify-content-between">
                                    <div class="XDC-detail-label">Voters</div>
                                    <div class="XDC-detail-value-small">000</div>
                                </div> -->
                                <!-- <div class="XDC-detail-section d-flex justify-content-between">
                                    <div class="XDC-detail-label">Location</div>
                                    <div class="XDC-detail-value-small">N/A</div>
                                </div>
                                <div class="XDC-detail-section d-flex justify-content-between">
                                    <div class="XDC-detail-label">Since time</div>
                                    <div class="XDC-detail-value-small">2020-09-12</div>
                                </div> -->
                                <div class="XDC-detail-section">
                                    <div class="XDC-detail-label">Owner Address</div>
                                    <div class="XDC-detail-value-small">
                                        <router-link
                                            :to="'/voter/' + candidate.owner"
                                            class="text-truncate">
                                            {{ candidate.owner }}
                                        </router-link>
                                    </div>
                                </div>
                                <div class="XDC-detail-section">
                                    <div class="XDC-detail-label">Coinbase Address</div>
                                    <div class="XDC-detail-value-small">
                                        <router-link
                                            :to="'/candidate/' + candidate.address"
                                            class="text-truncate">
                                            {{ candidate.address }}
                                        </router-link>
                                    </div>
                                </div>
                                <div
                                    class="buttons text-right">
                                    <b-button
                                        v-if="candidate.owner === account && candidate.status !== 'RESIGNED'"
                                        :to="`/resign/${candidate.address}`"
                                        variant="secondary">Resign</b-button>
                                <!-- <b-button
                                    v-if="candidate.voted > 0"
                                    :to="`/unvoting/${candidate.address}`"
                                    variant="secondary">Unvote</b-button>
                                <b-button
                                    v-if="candidate.status !== 'RESIGNED' && isXDCnet"
                                    :to="`/voting/${candidate.address}`"
                                    variant="primary">Vote</b-button> -->
                                </div>
                            </div>

                            <!-- <div class="section section&#45;&#45;candidate">
                                <div class="section-title">
                                    <span>
                                        {{ (candidate.rank) ? `${candidate.rank}. ${candidate.name}` : candidate.name }}
                                    </span>

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
                                                v-if="value !== ''"
                                                :href="value"
                                                target="_blank"
                                                class="social-links__link">
                                                <i :class="'social-links__icon tm-' + key" />
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                <div class="row m-md-0">
                                    <div
                                        class="col-12 XDC-info text-truncate">
                                        <p class="XDC-info__title">
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
                                    <div
                                        v-if="candidate.status !== 'STANDBY'"
                                        class="col-12 XDC-info">
                                        <p class="XDC-info__title">
                                            <span class="XDC-info__text">Latest Signed Block</span>
                                        </p>
                                        <p class="XDC-info__description">
                                            <span
                                                :class="`float-left mr-2 XDC-status-dot&#45;&#45;${getColor(
                                                candidate.latestSignedBlock || 0, currentBlock)}`">
                                                {{ formatNumber(candidate.latestSignedBlock) }}
                                            </span>
                                        </p>
                                    </div>
                                    <div class="col-12 XDC-info">
                                        <p class="XDC-info__title">
                                            <span class="XDC-info__text">Capacity</span>
                                        </p>
                                        <p
                                            id="XDC-info__description&#45;&#45;cap"
                                            class="XDC-info__description">
                                            {{ formatCurrencySymbol(formatBigNumber(candidate.cap, 3)) }}
                                            <b-tooltip
                                                v-if="checkLongNumber(candidate.cap)"
                                                ref="tooltip"
                                                target="XDC-info__description&#45;&#45;cap">
                                                {{ formatCurrencySymbol(formatBigNumber(candidate.cap, 6)) }}
                                            </b-tooltip>
                                        </p>
                                    </div>
                                    <div
                                        v-if="isReady"
                                        class="col-12 XDC-info">
                                        <p class="XDC-info__title">
                                            <i class="tm-arrow-up XDC-info__icon" />
                                            <span class="XDC-info__text">You voted</span>
                                        </p>
                                        <p
                                            id="XDC-info__description&#45;&#45;you-voted"
                                            class="XDC-info__description">
                                            {{ formatCurrencySymbol(formatNumber(candidate.voted)) }}
                                            <b-tooltip
                                                v-if="checkLongNumber(candidate.voted)"
                                                ref="tooltip"
                                                target="XDC-info__description&#45;&#45;you-voted">
                                                {{ formatCurrencySymbol(formatBigNumber(candidate.voted, 6)) }}
                                            </b-tooltip>
                                        </p>
                                    </div>
                                    <div
                                        class="col-12 XDC-info">
                                        <p class="XDC-info__title">
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
                                    <div class="col-12 order-md-1 order-lg-0 XDC-info">
                                        <p class="XDC-info__title">
                                            <span class="XDC-info__text">Hardware</span>
                                        </p>
                                        <p class="XDC-info__description">
                                            {{ candidate.hardwareInfo }}
                                        </p>
                                    </div>
                                    <div
                                        v-for="(value, key) in candidate.dataCenterInfo"
                                        :key="key"
                                        class="col-12 XDC-info">
                                        <p class="XDC-info__title">
                                            <span class="XDC-info__text">{{ key }}</span>
                                        </p>
                                        <p class="XDC-info__description">
                                            {{ value }}
                                        </p>
                                    </div>
                                    <div class="col-12 XDC-info">
                                        <p class="XDC-info__title">
                                            <span class="XDC-info__text">Est. Staking ROI</span>
                                        </p>
                                        <p
                                            id="XDC-info__description&#45;&#45;balance"
                                            class="XDC-info__description">
                                            {{ voterROI ? voterROI + '%' : '-&#45;&#45;' }}
                                        </p>
                                    </div>
                                    <div class="col-12   XDC-info">
                                        <p class="XDC-info__title">
                                            <span class="XDC-info__text">Est. Owner ROI</span>
                                        </p>
                                        <p
                                            id="XDC-info__description&#45;&#45;balance"
                                            class="XDC-info__description">
                                            {{ mnROI ? mnROI + '%' : '-&#45;&#45;' }}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    class="buttons text-right">
                                    <b-button
                                        v-if="candidate.owner === account && candidate.status !== 'RESIGNED'"
                                        :to="`/resign/${candidate.address}`"
                                        variant="secondary">Resign</b-button>
                                    <b-button
                                        v-if="candidate.voted > 0"
                                        :to="`/unvoting/${candidate.address}`"
                                        variant="secondary">Unvote</b-button>
                                    <b-button
                                        v-if="candidate.status !== 'RESIGNED' && isXDCnet"
                                        :to="`/voting/${candidate.address}`"
                                        variant="primary">Vote</b-button>
                                </div>
                            </div> -->
                        </b-card>
                    </div>
                    <div
                        class="col-12 col-md-8 col-lg-8">
                        <b-card
                            :class="'XDC-card XDC-card--lighter'
                            + (loading ? ' XDC-loading' : '')">
                            <b-tabs
                                pills
                                card
                                class="XDC-tab">
                                <b-tab
                                    title="Staking"
                                    active>
                                    <div
                                        :class="'section section--txs'
                                        + (txLoading ? ' XDC-loading' : '')">
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
                                                    title="View on XDCScan"
                                                    target="_blank">
                                                    <i class="tm-eye" />
                                                    <span>View on XDCScan</span>
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
                                </b-tab>
                                <!-- <b-tab title="Voters">
                                    <div
                                        :class="'section section-voters'
                                        + (voterLoading ? ' XDC-loading' : '')">
                                        <b-table
                                            :items="voters"
                                            :fields="voterFields"
                                            :per-page="voterPerPage"
                                            :show-empty="true"
                                            :class="`XDC-table XDC-table--voter${voterLoading ? ' loading' : ''}`"
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
                                </b-tab> -->
                                <b-tab title="Rewards">
                                    <div
                                        :class="'section section--mnrewards'
                                        + (rewardLoading ? ' XDC-loading' : '')">
                                        <div class="row candidate-reward-bar">
                                            <div class="col-12">
                                                <h3 class="section-title">
                                                    <span
                                                        v-if="candidate.slashedTimes"
                                                        class="text-truncate section-title__description">
                                                        MN was slashed for {{ candidate.slashedTimes }}
                                                        {{ candidate.slashedTimes > 1 ? 'epochs' : 'epoch' }} over the past week </span>
                                                    <span
                                                        class="text-truncate section-title__description">
                                                        Slashing history:
                                                        <a
                                                            :class="currentTab === 'week' ? 'tab-active' : ''"
                                                            @click="filterSlash('week')">1 Week</a>
                                                        <span>|</span>
                                                        <a
                                                            :class="currentTab === 'month' ? 'tab-active' : ''"
                                                            @click="filterSlash('month')">1 Month</a>
                                                        <span>|</span>
                                                        <a
                                                            :class="currentTab === 'year' ? 'tab-active' : ''"
                                                            @click="filterSlash('year')">1 Year</a>
                                                    </span>
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
                                            :empty-text="`There are no ${(currentTab !== '' ? 'records' : 'rewards')} to show`"
                                            stacked="md" >

                                            <template
                                                slot="checkpoint"
                                                slot-scope="data">{{ data.item.checkpoint }}
                                            </template>

                                            <template
                                                slot="reward"
                                                slot-scope="data">
                                                {{ !isNaN(data.item.reward)
                                                ? formatCurrencySymbol(formatNumber(data.item.reward)) : data.item.reward }}
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
                                    </div>
                                </b-tab>
                            </b-tabs>
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
                        </b-card>
                    </div>
                </b-row>
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
    metaInfo: {
        title: 'Candidate Details | XDC Network Governance DApp',
        meta: [
            { name: 'description', content: 'Staking XDC Network Masternode to get the reward every epochs. You can use mobile, desktop, hardware wallet - ledger nano, trezor to stake XDC Network' } // eslint-disable-line
        ]
    },
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
                    key: 'name',
                    label: 'Name',
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
            voterROI: '',
            mnROI: '',
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
        self.config = store.get('configMaster') || await this.appConfig()
        self.currentBlock = self.config.blockchain.blockNumber
        self.isReady = !!self.web3
        try {
            if (self.isReady) {
                let contract// = self.XDCValidator.deployed()
                contract = self.XDCValidator
                self.account = store.get('address') ||
                    self.$store.state.address || await self.getAccount()
                if (self.account.substring(0, 2) === '0x') {
                    self.account = 'xdc' + self.account.substring(2)
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
        self.getCandidateVoters()
        self.getCandidateTransactions()
        await self.getCandidateData()
        self.getCandidateRewards()
        if (self.candidate.rank) {
            self.getAnnualReward()
        }
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
                    console.log(data, 'data')
                    self.isCandidate = data.candidate
                    self.candidate.name = data.name ? data.name : 'XDC.Network'
                    self.candidate.status = data.status
                    self.candidate.nodeId = data.nodeId
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
                    // let contract = self.XDCValidator
                    // console.log('1111', '0x' + address.substring(3))
                    // self.KYC.url = await contract.methods.getLatestKYC.call('0x' + address.substring(3))
                    self.KYC.status = await this.getKYCStatus('0x' + self.candidate.owner.substring(3))
                    console.log(self.KYC, 'statusstatus')
                    if (self.KYC.status) self.KYC.url = `https://kycdocs.xinfin.network/${self.KYC.status}`
                    if (self.account) {
                        try {
                            let contract// = await self.getXDCValidatorInstance()
                            contract = self.XDCValidator
                            // youVoted = await contract.getVoterCap(address, self.account)
                            youVoted = await contract.methods.getVoterCap(address, self.account)
                                .call()
                            self.candidate.cap = await contract.methods.getCandidateCap(address)
                                .call().div(1e18).toNumber()
                        } catch (e) {}
                    }

                    self.candidate.voted = new BigNumber(youVoted).div(10 ** 18).toNumber()
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
                        status: r.status,
                        name: self.candidate.name || 'XDC.Network'
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
        async getAnnualReward () {
            axios.get('/api/voters/annualReward?candidate=' + this.candidate.address)
                .then((result) => {
                    if (result.data && result.data.voterROI) {
                        this.voterROI = result.data.voterROI.toFixed(2)
                        this.mnROI = result.data.mnROI.toFixed(2)
                    }
                })
                .catch(error => {
                    console.log(error)
                    this.$toasted.show(error, { type: 'error' })
                })
        },
        async getKYCStatus (account) {
            // let contract = await this.getXDCValidatorInstance()
            let contract = this.XDCValidator
            if (contract) {
                console.log(account, 'getKYC')
                const isHashFound = await contract.methods.getHashCount(account).call()
                console.log(isHashFound, 'isHashFound')
                if (new BigNumber(isHashFound).toNumber()) {
                    const getKYC = await contract.methods.getLatestKYC(account).call()
                    // const KYCString = await contract.KYCString.call(account)
                    this.KYC.status = getKYC
                    return getKYC
                }
            } else {
                console.log('1111')
            }
        }
    }
}
</script>
