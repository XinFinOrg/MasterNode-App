'use strict'

const fs = require('fs')

// copy & save XDCValidator
let XDCValidatorAbi = require('./build/contracts/XDCValidator.json')
let networks = XDCValidatorAbi.networks
networks['89'].address = '0x0000000000000000000000000000000000000088'
let data = JSON.stringify(XDCValidatorAbi, null, 2)
fs.writeFileSync('./abis/XDCValidator.json', data)

// copy & save BlockSigner
let BlockSignerAbi = require('./build/contracts/BlockSigner.json')
networks = BlockSignerAbi.networks
networks['89'].address = '0x0000000000000000000000000000000000000089'
data = JSON.stringify(BlockSignerAbi, null, 2)
fs.writeFileSync('./abis/BlockSigner.json', data)

// copy & save XDCRandomize
let XDCRandomizeAbi = require('./build/contracts/XDCRandomize.json')
networks = XDCRandomizeAbi.networks
networks['89'].address = '0x0000000000000000000000000000000000000090'
data = JSON.stringify(XDCRandomizeAbi, null, 2)
fs.writeFileSync('./abis/XDCRandomize.json', data)

// copy & save Migrations
let MigrationsAbi = require('./build/contracts/Migrations.json')
data = JSON.stringify(MigrationsAbi, null, 2)
fs.writeFileSync('./abis/Migrations.json', data)

// copy & save SafeMath
let SafeMathAbi = require('./build/contracts/SafeMath.json')
data = JSON.stringify(SafeMathAbi, null, 2)
fs.writeFileSync('./abis/SafeMath.json', data)
