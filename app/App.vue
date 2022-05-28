<template>
    <div id="app">
        <div class="page-layout">
            <b-navbar
                toggleable="lg"
                type="dark">
                <div class="container">
                    <b-navbar-brand to="/">
                        <img src="/app/assets/img/logo.svg" >
                    </b-navbar-brand>
                    <b-navbar-toggle
                        target="nav-collapse"
                        class="btn-menu-sp"/>
                    <b-collapse
                        id="nav-collapse"
                        is-nav>
                        <!-- Right aligned nav items -->
                        <b-navbar-nav class="ml-auto ">
                            <b-nav-form class="search-form">
                                <auto-complete
                                    v-model="search"
                                    :items="items"/>
                                <b-button
                                    variant="outline-success"
                                    type="submit"
                                    @click="searchCandidate">Search</b-button>
                            </b-nav-form>
                        </b-navbar-nav>
                        <b-navbar-nav class="ml-auto navbar-buttons">
                            <b-button
                                v-if="!isXDCnet"
                                id="btn-become-candidate"
                                to="/setting"
                                variant="primary">Login</b-button>
                            <b-button
                                v-else
                                id="btn-become-candidate"
                                to="/apply"
                                variant="primary">Become a candidate</b-button>
                            <b-dropdown
                                v-if="isXDCnet"
                                class="dd-setting ml-1"
                                right
                                offset="25"
                                no-caret
                                variant="primary">
                                <template
                                    slot="button-content">
                                    <i class="tm-cog icon-2x"/>
                                </template>
                                <b-dropdown-item
                                    :to="`/voter/${account}`"
                                    class="dd-address">
                                    {{ truncate(account, 20) }}
                                </b-dropdown-item>
                                <b-dropdown-divider />
                                <b-dropdown-item
                                    target="_bank"
                                    href="https://howto.xinfin.org/">Help</b-dropdown-item>
                                <b-dropdown-item to="/setting">Settings/Withdraws</b-dropdown-item>
                                <b-dropdown-divider />
                                <b-dropdown-item
                                    v-if="!mobileCheck && isXDCnet"
                                    href="/"
                                    @click="signOut">Sign out</b-dropdown-item>
                            </b-dropdown>
                        </b-navbar-nav>
                    </b-collapse>
                </div>
            </b-navbar>
            <div>
                <router-view/>
            </div>
            <footer
                class="XDC-footer">
                <div class="container">
                    <div class="row">
                        <div class="col-md-8">
                            <!-- <div class="XDC-footer__links">
                                <ul class="list-inline">
                                    <li class="list-inline-item">
                                        <a
                                            :href="needHelpLink"
                                            target="_blank">Need help?</a>
                                    </li>|
                                    <li class="list-inline-item">
                                        <a
                                            target="_blank"
                                            href="https://docs.xinfin.network/legal/privacy">Privacy Policy</a>
                                    </li>|
                                    <li class="list-inline-item">
                                        <a
                                            target="_blank"
                                            href="https://docs.xinfin.network/legal/terms-of-use">Terms of Use</a>
                                    </li>|
                                    <li class="list-inline-item">
                                        <a
                                            target="_blank"
                                            href="/api-docs">API Documentation</a>
                                    </li>
                                </ul>
                            </div> -->
                            <div class="XDC-footer__copyright">
                                &copy; {{ (new Date()).getFullYear() }} XDC.Network All rights reserved.
                            </div>
                        </div>
                        <div class="col-md-4 XDC-footer__social">
                            <ul class="list-inline">
                                <li class="list-inline-item">
                                    <a
                                        href="https://t.me/xinfintalk"
                                        target="_blank">
                                        <i class="tm-telegram" />
                                    </a>
                                </li>
                                <li class="list-inline-item">
                                    <a
                                        href="https://www.facebook.com/XinFinHybridBlockchain/"
                                        target="_blank">
                                        <i class="tm-facebook" />
                                    </a>
                                </li>
                                <li class="list-inline-item">
                                    <a
                                        href="https://twitter.com/XinFin_Official"
                                        target="_blank">
                                        <i class="tm-twitter" />
                                    </a>
                                </li>
                                <li class="list-inline-item">
                                    <a
                                        href="https://github.com/XinFinOrg"
                                        target="_blank">
                                        <i class="tm-github" />
                                    </a>
                                </li>
                                <li class="list-inline-item">
                                    <a
                                        href="https://www.reddit.com/r/xinfin"
                                        target="_blank">
                                        <i class="tm-reddit" />
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    </div>
</template>

<script>
import axios from 'axios'
import store from 'store'
import moment from 'moment'
import pkg from '../package.json'
import AutoComplete from './components/AutoComplete.vue'
export default {
    name: 'App',
    metaInfo: {
        title: 'XDC Network Governance DApp ',
        meta: [
            { name: 'description', content: 'Providing a professional UI which allows coin-holders to stake for masternodes, decentralized governance and explore masternode performance statistics' } // eslint-disable-line
        ]
    },
    components: {
        AutoComplete
    },
    data () {
        return {
            isReady: !!this.web3,
            showProgressBar: false,
            selectedCandidate: null,
            search: null,
            isXDCnet: false,
            version: pkg.version,
            account: '',
            items: [],
            statusClass: '',
            interval: '',
            notifications: [],
            readNoti: 0,
            needHelpLink: 'https://docs.xinfin.network/faq/products/xdcchain-applications/masternodeapp'
        }
    },
    computed: {
        mobileCheck: () => {
            const isAndroid = navigator.userAgent.match(/Android/i)
            const isIOS = navigator.userAgent.match(/iPhone|iPad|iPod/i)
            return (isAndroid || isIOS)
        }
    },
    async updated () {
        await this.checkNetworkAndLogin()
    },
    destroyed () {
        if (this.interval) {
            clearInterval(this.interval)
        }
    },
    created: async function () {
        let self = this

        try {
            if (!self.isReady && self.NetworkProvider === 'metamask') {
                throw Error('Web3 is not properly detected. Have you installed MetaMask extension?')
            }
            self.$bus.$on('logged', async () => {
                await self.checkNetworkAndLogin()
                setTimeout(async () => {
                    await self.getNotification()
                }, 500)
            })
            // const candidates = await axios.get('/api/candidates')
            // const map = candidates.data.items.map((c) => {
            //     return {
            //         name: c.name ? c.name : 'XDC.Network',
            //         address: c.candidate
            //     }
            // })
            // const mapping = await Promise.all(map)
            // self.items = mapping
            setTimeout(async () => {
                await self.getNotification()
            }, 500)
            if (this.isXDCnet) {
                this.interval = setInterval(async () => {
                    await this.getNotification()
                }, 40000)
            }
        } catch (e) {
            console.log(e)
        }
    },
    methods: {
        searchCandidate (e) {
            e.preventDefault()
            const regexpAddr = /^(0x)?[0-9a-fA-F]{40}$/

            let to = null
            let search = (this.search || '').trim()
            if (regexpAddr.test(search)) {
                axios.get(`/api/search/${search}`)
                    .then((response) => {
                        const data = response.data
                        if (Object.keys(data.candidate).length > 0) {
                            to = { path: `/candidate/${data.candidate.candidate}` }
                        } else if (Object.keys(data.voter).length > 0) {
                            to = { path: `/voter/${search}` }
                        } else {
                            this.$toasted.show('Not found')
                        }
                        if (!to) {
                            return false
                        }
                        this.search = ''
                        return this.$router.push(to)
                    }).catch(e => console.log(e))
            }
        },
        goPage: function (s) {
            this.$router.push({ path: `/candidate/${s}` })
        },
        async checkNetworkAndLogin () {
            let self = this
            setTimeout(async () => {
                try {
                    let contract// = await self.getXDCValidatorInstance()
                    contract = self.XDCValidator
                    self.account = store.get('address') ||
                        self.$store.state.address || await self.getAccount()
                    if (self.account.substring(0, 2) === '0x') {
                        self.account = 'xdc' + self.account.substring(2)
                    }
                    if (self.account && contract) {
                        self.isXDCnet = true
                    }
                } catch (error) {}
            }, 0)
        },
        signOut () {
            store.clearAll()
            Object.assign(this.$store.state, this.getDefaultState())
            // this.$store.state.address = null

            this.$router.go({
                path: '/'
            })
        },
        async readClick () {
            this.statusClass = 'display: none;'
        },
        async getNotification () {
            try {
                const self = this
                if (self.account && self.isXDCnet) {
                    const { data } = await axios.get('/api/voters/' + self.account.toLowerCase() + '/getNotification')
                    if (data.length > 0) {
                        let items = []
                        let readNoti = 0
                        data.map(d => {
                            if (!d.isRead) {
                                readNoti++
                            }
                            items.push({
                                event: d.event,
                                createdAt: moment(d.createdAt).fromNow(),
                                name: d.candidateName,
                                candidate: d.candidate,
                                isRead: d.isRead
                            })
                        })
                        self.readNoti = readNoti
                        self.notifications = items
                    }
                }
            } catch (error) {
                console.log(error)
            }
        },
        async markReadAll () {
            // mark read all
            this.readNoti = 0
            await axios.get('/api/voters/' + this.account.toLowerCase() + '/markReadAll')
            this.notifications = this.notifications.map(n => {
                n.isRead = true
                return n
            })
        }
    }
}
</script>
