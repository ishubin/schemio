const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const rules = require('./webpack.rules.js');

rules.push({
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
}, {
    // Ask webpack to check: If this file ends with .vue, then apply some transforms
    test: /\.vue$/,
    // don't transform node_modules folder (which don't need to be compiled)
    exclude: /(node_modules|bower_components)/,
    // Transform it with vue
    use: 'vue-loader'
});

module.exports = {
    module: {
        rules,
    },
    // target: 'web',
    plugins: [
        new VueLoaderPlugin(),
        new webpack.DefinePlugin({
            __BUILD_VERSION__: new Date().getTime(),
        }),
        new CopyWebpackPlugin({
            patterns: [{
                from: path.resolve(__dirname, 'assets'),
                to: path.resolve(__dirname, '.webpack/renderer', 'assets')
            }]
        })
    ]
};
