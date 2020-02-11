'use strict'
const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const IpfsClient = require('ipfs-http-client')

const xinFinClient = new IpfsClient({
    host: 'ipfs.xinfin.network',
    port: 443,
    protocol: 'https'
})

if (!fs.existsSync(path.join(__dirname, '../tmp/'))) {
    fs.mkdirSync(path.join(__dirname, '../tmp/'))
}

router.post('/addKYC', async function (req, res, next) {
    let imageFile = req.files.filename

    xinFinClient.add(imageFile.data, async (err, ipfsHash) => {
        if (err != null) {
            // error occured, log out the error
            console.error('Error occured while adding KYC at /addKYC: ', err)
            res.status(500).send(err)
            return
        }
        let hash = ipfsHash[0].hash
        // all ok
        res.status(200).json({ 'hash': hash })
    })
})

module.exports = router
