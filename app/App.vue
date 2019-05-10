<template>
    <div id="app">
        <div class="page-layout">
            <b-navbar>
                <div class="container">
                    <b-navbar-brand to="/">
                        Home
                    </b-navbar-brand>

                    <b-nav-form class="search-form">
                        <b-form-input
                            v-model="search"
                            type="text"
                            autocomplete="off"
                            placeholder="Search Node..."
                            @keyup.enter="searchCandidate"
                        />
                        <b-button
                            variant="outline-success"
                            type="submit"
                            @click="searchCandidate">Search</b-button>

                    </b-nav-form>

                    <div class="navbar-buttons">
                        <b-button
                            id="btn-become-candidate"
                            href="https://github.com/XinFinOrg/XinFin-Node"
                            target="_blank"
                            variant="primary">Setup MasterNode</b-button>
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
                        <!-- <a
                            target="_blank"
                            href="https://xinfin.network/#webWallet"><i class=""/> New to XinFin ? Create an Wallet</a> -->
                        <b-dropdown
                            v-if="isXDCnet"
                            class="dd-setting"
                            right
                            offset="25"
                            no-caret
                            variant="primary">
                            <template
                                slot="button-content">
                                <i class="tm-cog ml-2 icon-2x"/>
                            </template>
                            <!-- <b-dropdown-item
                                :to="`/voter/${account}`"
                                class="dd-address">
                                {{ truncate(account, 20) }}
                            </b-dropdown-item>
                            <b-dropdown-divider /> -->
                            <b-dropdown-item
                                target="_bank"
                                href="https://github.com/xinfinorg/">Help</b-dropdown-item>
                            <b-dropdown-item to="/setting">Settings/Withdraws</b-dropdown-item>
                            <b-dropdown-divider />
                            <b-dropdown-item
                                href="/"
                                @click="signOut">Sign out</b-dropdown-item>
                        </b-dropdown>                        <!-- <router-link
                        v-if="isXDCnet"
                        id="btn-setting"
                        to="/setting">
                        <i class="tm-dots color-btn-bg"/>Setting</router-link> -->
                    </div>
                </div>
            </b-navbar>
            <div class="main-content">
                <router-view/>
            </div>
            <footer
                class="XDC-footer">
                <div class="container">
                    <div class="row">
                        <div class="col-md-8">
                            <div class="XDC-footer__copyright">
                                &copy; {{ (new Date()).getFullYear() }} XinFin. All Rights Reserved.
                            </div>
                            <div class="XDC-footer__links">
                                <ul class="list-inline">
                                    <li class="list-inline-item">
                                        <a
                                            target="_blank"
                                            href="https://www.xinfin.org/"><i class="tm-lifebuoy mr-1"/>Need help?</a>
                                    </li>
                                    <!-- <li class="list-inline-item">
                                        <a
                                            target="_blank"
                                            href="/privacyPolicy"><i class="tm-lock mr-1"/>Privacy Policy</a>
                                    </li>
                                    <li class="list-inline-item">
                                        <a
                                            target="_blank"
                                            href="/terms"><i class="tm-profile mr-1"/>Terms of Service</a>
                                    </li> -->
                                </ul>
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
            readNoti: 0
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
            const candidates = await axios.get('/api/candidates')
            const map = candidates.data.items.map((c) => {
                return {
                    name: c.name ? c.name : 'XinFin MasterNode',
                    address: c.candidate
                }
            })
            const mapping = await Promise.all(map)
            self.items = mapping
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
                    const contract = await self.getXDCValidatorInstance()
                    if (store.get('address')) {
                        self.account = store.get('address').toLowerCase()
                    } else {
                        self.account = this.$store.state.walletLoggedIn
                            ? this.$store.state.walletLoggedIn : await self.getAccount()
                    }
                    if (self.account && contract) {
                        self.isXDCnet = true
                    }
                } catch (error) {}
            }, 0)
        },
        signOut () {
            store.clearAll()
            this.$store.state.walletLoggedIn = null

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
