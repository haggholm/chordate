module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: '12' } }],
    ['@babel/preset-typescript'],
    '@babel/preset-react',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-syntax-dynamic-import',
  ],
  inputSourceMap: true,
};
