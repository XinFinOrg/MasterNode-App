const XDCRandomize = artifacts.require('XDCRandomize')
const tryCatch = require('./helpers/exceptions.js').tryCatch
const errTypes = require('./helpers/exceptions.js').errTypes

const byte0 = '0x0000000000000000000000000000000000000000000000000000000000000000'
const byte1 = '0x0000000000000000000000000000000000000000000000000000000000000001'

contract('XDCRandomize', (accounts) => {
    it('Set a news', async () => {
        const randomize = await XDCRandomize.new()

        await tryCatch(randomize.setSecret([byte0, byte1], { from : accounts[0] }), errTypes.revert)
        await tryCatch(randomize.getSecret.call(accounts[0]), errTypes.revert)
        await tryCatch(randomize.setOpening(byte0, { from : accounts[0] }), errTypes.revert)

        await tryCatch(randomize.getOpening(accounts[0], { from : accounts[0] }), errTypes.revert)
    })
})
