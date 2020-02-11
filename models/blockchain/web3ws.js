'use strict'

const Web3 = require('xdc3')
const config = require('config')

const web3Ws = {
    Web3Ws: function () {
        // console.log(`Here me at WEB3WS`)
        let provider = new Web3.providers.WebsocketProvider(config.get('blockchain.ws'))
        let web3 = new Web3(provider)
        return web3
    },
    Web3WsInternal: function () {
        // console.log(`Here me at Web3WsInternal`)
        let provider = new Web3.providers.WebsocketProvider(config.get('blockchain.internalWs'))
        let web3 = new Web3(provider)
        // console.log(web3)
        return web3
    }
}

// function Web3Ws () {
//     let provider = new Web3.providers.WebsocketProvider(config.get('blockchain.ws'))
//     let web3 = new Web3(provider)
//     return web3
// }

module.exports = web3Ws
