module.exports = {
	presets: [
		[
			'@babel/preset-env',
			{
				targets: ['last 2 Chrome versions'],
				exclude: ['transform-for-of', 'transform-async-to-generator'],
			},
		],
		['@babel/preset-typescript'],
	],
	plugins: [
		'@babel/plugin-transform-react-jsx',
		['@babel/plugin-proposal-decorators', { legacy: true }],
		'@babel/plugin-proposal-class-properties',
		'@babel/plugin-proposal-object-rest-spread',
		'@babel/plugin-syntax-dynamic-import',
		'babel-plugin-lodash',
	],
};
