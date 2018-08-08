const path = require('path');
const fs = require('fs');

WrapperPlugin = require('wrapper-webpack-plugin');

const headerDoc = fs.readFileSync('./dist-header.js', 'utf8');
const footerDoc = fs.readFileSync('./dist-footer.js', 'utf8');

var xrPolyfill = {
    entry: './polyfill/XRPolyfill.js',
    output: {
	    filename: 'webxr-polyfill.js',
	    path: path.resolve(__dirname, 'dist')
    },
    plugins: [
	    new WrapperPlugin({
	      header: headerDoc,
	      footer: footerDoc
	    })
  	],
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

var xrVideoWorker = {
  entry: './polyfill/XRWorkerPolyfill.js',
  output: {
		filename: 'webxr-worker.js',
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

module.exports = [xrPolyfill, xrVideoWorker]
