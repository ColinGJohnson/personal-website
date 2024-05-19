import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import 'webpack-dev-server';

const config: webpack.Configuration = {
  entry: {
    index: "./src/app.ts",
  },
  mode: "development",
  devtool: 'inline-source-map',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: ['tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader",
        ],
      },
      {
        test: /\.wgsl$/i,
        use: 'raw-loader',
      },
      {
        test: /\.hbs$/,
        use: "handlebars-loader"
      }
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
