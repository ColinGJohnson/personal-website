import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import 'webpack-dev-server';

let isProduction = process.env.NODE_ENV === 'production';

const config: webpack.Configuration = {
  entry: {
    index: './src/app.ts',
  },
  mode: 'development',
  devtool: isProduction ? false : 'inline-source-map',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ],
      },
      {
        test: /\.wgsl$/i,
        use: 'raw-loader',
      },
      {
        test: /\.hbs$/,
        use: 'handlebars-loader'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
        }
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/robots.txt' }
      ]
    }),
    new HtmlWebpackPlugin({
      title: 'Colin Johnson',
      inject: false,
      template: 'src/index.hbs',
      favicon: 'src/favicon.svg'
    }),
    new MiniCssExtractPlugin(),
  ],
};

// noinspection JSUnusedGlobalSymbols
export default config;
