'use strict'

const Web3 = require('xdc3')
const config = require('config')

const web3Prc = {
    Web3Rpc: function () {
        const provider = new Web3.providers.HttpProvider(config.get('blockchain.rpc'), { timeout: 10000 })
        const web3 = new Web3(provider)
        return web3
    },
    Web3RpcInternal: function () {
        const rpcUrl = (config.has('blockchain.internalRpc') && config.get('blockchain.internalRpc')) ? config.get('blockchain.internalRpc') : config.get('blockchain.rpc')
        const internalProvider = new Web3.providers.HttpProvider(rpcUrl, { timeout: 10000 })
        const web3Internal = new Web3(internalProvider)
        return web3Internal
    }
}

module.exports = web3Prc
