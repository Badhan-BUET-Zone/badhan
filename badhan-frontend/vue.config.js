const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  pwa: {
    themeColor: "#ee0000",
    msTileColor: '#000000',
    manifestOptions: {
      name: "Badhan",
      short_name: "Badhan",
    },
  },
  devServer: {
    host: '0.0.0.0',
    allowedHosts: 'all',
    client: {
      progress: false,
    },
  },
  transpileDependencies: [
    'vuetify'
  ],
  configureWebpack: {
    watchOptions: {
      poll: 1000,
      ignored: /node_modules/,
    },
    module: {
      rules: [{
        test: /\.md$/,
        loader: 'raw-loader' // npm install -D raw-loader
      }, {
        test: /\.gradle$/,
        loader: 'raw-loader' // npm install -D raw-loader
      }]
    }
  }
})
