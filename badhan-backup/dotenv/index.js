const index = require('dotenv')

index.config({ path: './config/config.env'})

const config = {
  MONGODB_URI_PROD: process.env.MONGODB_URI_PROD,
  MONGODB_URI_TEST: process.env.MONGODB_URI_TEST,
}

Object.keys(config).forEach((key) => {
  if (config[key] === undefined) {
    console.log('LOG: ', key, 'is not defined in config. Program will exit')
    process.exit(1)
  }
})

module.exports = config