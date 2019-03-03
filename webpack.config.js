const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const outputDirectory = 'dist';

module.exports = {
	entry: './src/client/index.tsx',
	output: {
		path: path.join(__dirname, outputDirectory),
		filename: 'bundle.js',
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/i,
				exclude: /node_modules/,
				use: { loader: 'babel-loader' },
			},
			{
				test: /\.scss$/,
				use: [
					'style-loader',
					'css-loader',
					{
						loader: 'sass-loader',
						options: {
							includePaths: [
								// path.join(__dirname, 'node_modules'),
								// path.join(__dirname, 'node_modules', 'bootstrap-sass', 'assets'),
								path.join(
									__dirname,
									'node_modules',
									'bootstrap-sass',
									'assets',
									'stylesheets'
								),
							],
						},
					},
				],
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.(png|jpg|gif|woff|woff2|ttf|svg|eot)$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							emit: true,
						},
					},
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
		new CleanWebpackPlugin([outputDirectory]),
		new HtmlWebpackPlugin({
			template: './public/index.html',
			favicon: './public/favicon.ico',
		}),
	],
};
