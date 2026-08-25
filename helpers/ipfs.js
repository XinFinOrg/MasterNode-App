'use strict'
const axios = require('axios')
const FormData = require('form-data')

const IPFS_API_ADD_URL = 'https://ipfs.xinfin.network/api/v0/add'

/**
 * Uploads a file buffer to XinFin IPFS with retry logic.
 */
async function addFileToXinfinIpfs (buffer, filename, callback) {
    try {
        if (!buffer || buffer.length === 0) {
            return callback(new Error('File buffer is empty'))
        }

        const fileBuffer = Buffer.isBuffer(buffer)
            ? buffer
            : Buffer.from(buffer)

        const form = new FormData()

        form.append('file', fileBuffer, {
            filename: filename || 'kyc.pdf',
            contentType: 'application/pdf',
            knownLength: fileBuffer.length
        })

        const contentLength = form.getLengthSync()

        const headers = {
            ...form.getHeaders(),
            'Content-Length': contentLength
        }

        console.log('IPFS upload:', {
            url: IPFS_API_ADD_URL,
            fileSize: fileBuffer.length,
            contentLength: contentLength
        })

        const maxRetries = 2
        let attempt = 0
        let lastError = null

        while (attempt <= maxRetries) {
            try {
                if (attempt > 0) {
                    console.log(`IPFS upload retry attempt ${attempt} for ${filename || 'kyc.pdf'}`)
                }
                const response = await axios.post(IPFS_API_ADD_URL, form, {
                    headers: headers,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                    timeout: 60000
                })

                const hash = response.data && response.data.Hash
                if (!hash) {
                    throw new Error('IPFS API did not return a hash')
                }

                return callback(null, [{ hash: hash }])
            } catch (error) {
                lastError = error
                console.error(`IPFS upload failed on attempt ${attempt}:`, error.message)

                if (error.response) {
                    console.error('IPFS HTTP status:', error.response.status)
                    console.error('IPFS response:', error.response.data)
                }

                attempt++
                if (attempt <= maxRetries) {
                    // Wait for 1 second before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            }
        }

        // If we exhausted all retries
        callback(lastError)
    } catch (error) {
        callback(error)
    }
}

module.exports = {
    addFileToXinfinIpfs
}
