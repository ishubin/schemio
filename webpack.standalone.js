const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');


module.exports = {
    // This is the "main" file which should include all other modules
    entry: './src/ui/standalone-viewer.js',
    // Where should the compiled file go?
    output: {
        path: path.resolve(__dirname, 'public'),
        publicPath: 'public/standalone.js',
        filename: 'standalone.js'
    },
    resolve: {
        alias: {
            vue: 'vue/dist/vue.js'
        }
    },
    optimization: {
        minimize: true
    },
    module: {
        // Special compilation rules
        rules: [
            {
                // Ask webpack to check: If this file ends with .js, then apply some transforms
                test: /\.js$/,
                // Transform it with babel
                use: 'babel-loader',
                // don't transform node_modules folder (which don't need to be compiled)
                exclude: /node_modules/
            },
            {
                // Ask webpack to check: If this file ends with .vue, then apply some transforms
                test: /\.vue$/,
                // don't transform node_modules folder (which don't need to be compiled)
                exclude: /(node_modules|bower_components)/,
                // Transform it with vue
                use: 'vue-loader'
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin()
    ]
};

