'use strict'
const express = require('express')
const router = express.Router()
const {
    authLimiter,
    txLimiter,
    searchLimiter,
    uploadLimiter,
    readLimiter
} = require('../helpers/rateLimiters')

// Apply a generous read-limiter as a default for all /api/* traffic; stricter
// limiters are layered on top of sensitive sub-routers below.
router.use('/api/', readLimiter)

router.use('/api/auth', authLimiter, require('./auth'))
router.use('/api/ipfs', uploadLimiter, require('./ipfs'))
router.use('/api/search', searchLimiter, require('./search'))
router.use('/api/voters', txLimiter, require('./voters'))
router.use('/api/candidates', require('./candidates'))
router.use('/api/owners', require('./owners'))
router.use('/api/config', require('./config'))
router.use('/api/signers', require('./signers'))
router.use('/api/transactions', require('./transactions'))

module.exports = router
