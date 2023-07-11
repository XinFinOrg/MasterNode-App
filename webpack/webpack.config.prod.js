var path = require('path')
var webpack = require('webpack')
const { DefinePlugin } = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const commonConfig = require('./webpack.config.common')
const { merge } = require('webpack-merge')

const webpackConfig = merge(commonConfig, {
    mode: 'production',
    entry: {
        vendor: ['bignumber.js', 'vue', 'vue-router', 'vuex', 'xdc3']
    },
    target: 'browserslist',
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, '../build'),
        publicPath: '/build/',
        filename: '[name].[contenthash].js'
        // chunkFilename: '[name].chunks.[chunkhash].js'
        // jsonpFunction: 'pluginWebpack'
    },
    optimization: {
        minimize: true,
        splitChunks: {
            chunks: 'all',
            minSize: 30000,
            minChunks: 1,
            maxAsyncRequests: 5,
            maxInitialRequests: 3,
            cacheGroups: {
                vendor: {
                    name: 'node-vendor',
                    test: /[\\/]node_modules[\\/]/,
                    enforce: true
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true
                }
            }
        },
        runtimeChunk: 'single'
    },
    plugins: [
        new DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        }),
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        sourceMap: true,
                        loops: false,
                        compress: {
                            warnings: false
                        }
                    }
                })
            ]
        }),
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: ['**/*js', '**/*html', '**/*svg']
        }),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: 'index-prod.html',
            inject: true,
            chunksSortMode: 'auto'
        })
    ]
})

module.exports = webpackConfig
