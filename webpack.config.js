/* eslint-disable no-console,@typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-confusing-void-expression,@typescript-eslint/explicit-function-return-type,@typescript-eslint/prefer-includes */
// noinspection ES6ConvertRequireIntoImport

// webpack plugins
const TerserPlugin = require('terser-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const { resolve } = require("node:path");

// webpack global config template
module.exports = (env) => {

  return {
    entry: './src/swiper-card.ts',

    mode: 'production',

    target: 'browserslist',

    output: {
      filename: 'swiper-card.js',
      path: resolve('./dist')
    },

    optimization: {
      minimizer: [
        new TerserPlugin(
          {
            parallel: true,
            extractComments: false,
            terserOptions: {
              mangle: {
                reserved: ['module']
              }
            }
          })
      ]
    },


    plugins: [
      new ESLintPlugin({
        extensions: 'ts',
        threads: true
      }),
    ],

    module: {
      rules: [
        // TYPESCRIPT & BABEL
        {
          test: /\.tsx?$/i,
          use: [
            {
              // babel-loader: converts javascript (es6) to javascript (es5)
              loader: 'babel-loader'
            },
            {
              // ts-loader: convert typescript (es6) to javascript (es6),
              // allowing TS in node_modules for addon compilation by client projects
              loader: 'ts-loader'
            }
          ]
        },
        {
          test: /\.css$/i,
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: false
              }
            }
          ]
        }
      ]
    }
  }
}
