const path = require('path');

module.exports = {
  entry: './polyfill/XRPolyfill.js',
  output: {
    filename: 'webxr-polyfill.js',
    path: path.resolve(__dirname, 'dist')
  },
	module: {
		rules: [
			{
			test: /\.js$/,
			include: [
				path.resolve(__dirname, "polyfill"),
			],
			use: {
				loader: 'babel-loader',
				options: {
				presets: ['env']
				}
			}
			}
		]
  },
  resolve: {
	extensions: ['.js']
  }  
};
