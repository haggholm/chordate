"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var path = __importStar(require("path"));
var html_webpack_plugin_1 = __importDefault(require("html-webpack-plugin"));
var terser_webpack_plugin_1 = __importDefault(require("terser-webpack-plugin"));
// import PNPWebpackPlugin from 'pnp-webpack-plugin';
var fork_ts_checker_webpack_plugin_1 = __importDefault(require("fork-ts-checker-webpack-plugin"));
// import nodeExternals from 'webpack-node-externals';
require("babel-loader");
require("ts-loader");
require("cache-loader");
require("brfs");
require("transform-loader");
var mainConfig = {
    entry: './src/electron.ts',
    target: 'electron-main',
    output: {
        path: path.join(__dirname, 'src'),
        // path: path.join(__dirname, 'dist'),
        // path: __dirname,
        filename: 'electron.js'
    },
    cache: true,
    resolve: {
        // plugins: [PNPWebpackPlugin],
        extensions: ['.ts', '.js', '.json']
    },
    // resolveLoader: { plugins: [PNPWebpackPlugin.moduleLoader(module)] },
    module: {
        rules: [
            {
                test: /\.ts$/i,
                include: /src/,
                use: ['cache-loader', 'babel-loader' /*'ts-loader'*/]
            },
        ]
    },
    plugins: [new fork_ts_checker_webpack_plugin_1["default"]()],
    // externals: [nodeExternals()],
    // externals: ['aws-sdk'],
    node: {
        __dirname: false
    }
};
var renderConfig = {
    entry: './src/client.tsx',
    // entry: './src/esbuild-wrapper.tsx',
    target: 'electron-renderer',
    // externals: [nodeExternals()],
    output: {
        path: path.join(__dirname, 'src'),
        filename: 'client.js'
    },
    cache: true,
    devtool: 'source-map',
    optimization: {
        minimizer: [
            new terser_webpack_plugin_1["default"]({
                terserOptions: {
                    compress: true,
                    ecma: 2018,
                    ie8: false,
                    safari10: false,
                    keep_classnames: false,
                    keep_fnames: false,
                    sourceMap: true,
                    output: {
                        comments: false
                    }
                }
            }),
        ]
    },
    resolve: {
        // plugins: [PNPWebpackPlugin],
        extensions: ['.tsx', '.ts', '.js', '.json']
    },
    // resolveLoader: { plugins: [PNPWebpackPlugin.moduleLoader(module)] },
    module: {
        rules: [
            {
                test: /\.tsx?$/i,
                exclude: /node_modules/,
                use: ['cache-loader', 'babel-loader' /*'ts-loader'*/]
            },
            {
                test: /\.scss$/,
                use: ['cache-loader', 'style-loader', 'css-loader', 'sass-loader']
            },
            {
                test: /\.css$/,
                use: ['cache-loader', 'style-loader', 'css-loader']
            },
            {
                test: /\.(png|jpg|gif|woff|woff2|ttf|svg|eot)$/,
                use: [
                    'cache-loader',
                    { loader: 'file-loader', options: { emit: true } },
                ]
            },
        ]
    },
    devServer: {
        port: 3000,
        open: true,
        proxy: {
            '/api': 'http://localhost:8080'
        },
        historyApiFallback: true
    },
    plugins: [
        new html_webpack_plugin_1["default"]({
            template: './public/index.html',
            favicon: './public/favicon.ico'
        }),
        new fork_ts_checker_webpack_plugin_1["default"](),
    ]
};
exports["default"] = [mainConfig, renderConfig];
