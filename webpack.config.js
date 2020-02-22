"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const html_webpack_plugin_1 = __importDefault(require("html-webpack-plugin"));
const terser_webpack_plugin_1 = __importDefault(require("terser-webpack-plugin"));
const pnp_webpack_plugin_1 = __importDefault(require("pnp-webpack-plugin"));
const fork_ts_checker_webpack_plugin_1 = __importDefault(require("fork-ts-checker-webpack-plugin"));
const webpack_node_externals_1 = __importDefault(require("webpack-node-externals"));
require("ts-loader");
require("cache-loader");
require("brfs");
require("transform-loader");
const mainConfig = {
    entry: './src/electron.ts',
    target: 'electron-main',
    output: {
        path: path_1.default.join(__dirname, 'src'),
        // path: path.join(__dirname, 'dist'),
        // path: __dirname,
        filename: 'electron.js',
    },
    cache: true,
    resolve: {
        plugins: [pnp_webpack_plugin_1.default],
        extensions: ['.ts', '.js', '.json'],
    },
    resolveLoader: { plugins: [pnp_webpack_plugin_1.default.moduleLoader(module)] },
    module: {
        rules: [
            {
                test: /\.ts$/i,
                include: /src/,
                use: ['cache-loader', 'ts-loader'],
            },
        ],
    },
    plugins: [new fork_ts_checker_webpack_plugin_1.default()],
    externals: [webpack_node_externals_1.default()],
    // externals: ['aws-sdk'],
    node: {
        __dirname: false,
    },
};
const renderConfig = {
    entry: './src/client/index.tsx',
    target: 'electron-renderer',
    output: {
        path: path_1.default.join(__dirname, 'dist'),
        filename: 'client.js',
    },
    cache: true,
    devtool: 'source-map',
    optimization: {
        minimizer: [
            new terser_webpack_plugin_1.default({
                terserOptions: {
                    compress: true,
                    ecma: 2018,
                    ie8: false,
                    safari10: false,
                    keep_classnames: false,
                    keep_fnames: false,
                    sourceMap: true,
                    output: {
                        comments: false,
                    },
                },
            }),
        ],
    },
    resolve: {
        plugins: [pnp_webpack_plugin_1.default],
        extensions: ['.tsx', '.ts', '.js', '.json'],
    },
    resolveLoader: { plugins: [pnp_webpack_plugin_1.default.moduleLoader(module)] },
    module: {
        rules: [
            {
                test: /\.tsx?$/i,
                exclude: /node_modules/,
                use: ['cache-loader', 'ts-loader'],
            },
            {
                test: /\.scss$/,
                use: ['cache-loader', 'style-loader', 'css-loader', 'sass-loader'],
            },
            {
                test: /\.css$/,
                use: ['cache-loader', 'style-loader', 'css-loader'],
            },
            {
                test: /\.(png|jpg|gif|woff|woff2|ttf|svg|eot)$/,
                use: [
                    'cache-loader',
                    { loader: 'file-loader', options: { emit: true } },
                ],
            },
        ],
    },
    devServer: {
        port: 3000,
        open: true,
        proxy: {
            '/api': 'http://localhost:8080',
        },
        historyApiFallback: true,
    },
    plugins: [
        new html_webpack_plugin_1.default({
            template: './public/index.html',
            favicon: './public/favicon.ico',
        }),
        new fork_ts_checker_webpack_plugin_1.default(),
    ],
};
exports.default = [mainConfig, renderConfig];
//# sourceMappingURL=webpack.config.js.map