var path = require('path')
var appName = '[name].js'
const commonConfig = require('./webpack.config.common')
const { merge } = require('webpack-merge')
const fs = require('fs')

const webpackConfig = merge(commonConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    target: 'web',
    output: {
        path: path.resolve(__dirname, '../build'),
        publicPath: '/build/',
        filename: appName
        // chunkFilename: 'chunks/[chunkhash].js',
        // jsonpFunction: 'pluginWebpack'
    },
    devServer: {
        static: {
            directory: path.join(__dirname, '../')
        },
        https: {
            key: fs.readFileSync('./sslcert/server.key'),
            cert: fs.readFileSync('./sslcert/server.crt')
        },
        compress: true,
        historyApiFallback: true,
        // client: {
        //     overlay: true
        // },
        proxy: {
            '/api/*': {
                target: 'http://localhost:5001',
                secure: false
            }
        }
    }
})

module.exports = webpackConfig
