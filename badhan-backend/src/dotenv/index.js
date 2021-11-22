const dotenv = require('dotenv')

dotenv.config({ path: '.env.' + process.env.NODE_ENV })

const config = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI,
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
  VUE_APP_FRONTEND_BASE: process.env.VUE_APP_FRONTEND_BASE,
  RATE_LIMITER_ENABLE: process.env.RATE_LIMITER_ENABLE,
  MONGODB_URI: process.env.MONGODB_URI
}

Object.keys(config).forEach((key) => {
  if (config[key] === undefined) {
    console.log('BADHAN LOG: ', key, 'is not defined in config. Program will exit')
    process.exit(1)
  }
})

module.exports = config
