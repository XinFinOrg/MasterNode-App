'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

const KycLogSchema = new Schema({
    endpoint: String,
    method: String,
    headers: Schema.Types.Mixed,
    body: Schema.Types.Mixed,
    query: Schema.Types.Mixed,
    ip: String,
    files: [Schema.Types.Mixed],
    responseStatus: Number,
    responseData: Schema.Types.Mixed,
    success: Boolean
}, {
    timestamps: true
})

module.exports = mongoose.model('KycLog', KycLogSchema)
