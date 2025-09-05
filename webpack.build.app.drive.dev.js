const { VueLoaderPlugin } = require('vue-loader');
const webpack = require('webpack');
const path = require('path');
module.exports = {
    mode: 'production',
    // This is the "main" file which should include all other modules
    entry: './src/ui/main.app.drive.js',
    // Where should the compiled file go?
    output: {
        path: path.resolve(__dirname, 'dist/assets'),
        publicPath: 'dist/assets/schemio.app.drive.js',
        filename: 'schemio.app.drive.js'
    },
    optimization: {
        minimize: false
    },
    resolve: {
        alias: {
            // vue: 'vue/dist/vue.min.js',
            '@codemirror/state': path.resolve(__dirname, 'node_modules/@codemirror/state'),
            '@codemirror': path.resolve(__dirname, 'node_modules/@codemirror/'),
        }
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
                loader: 'vue-loader',
                options: {
                    compilerOptions: {
                        whitespace: 'preserve',
                    },
                },
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new webpack.DefinePlugin({
            __BUILD_VERSION__: new Date().getTime(),
        })
    ]
};
