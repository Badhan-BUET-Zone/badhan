import dotenv from 'dotenv'
import myConsole from "../response/myConsole";

dotenv.config({ path: '.env.' + process.env.NODE_ENV })

interface DotenvEnvFile {
  NODE_ENV: string,
  JWT_SECRET: string,
  // GMAIL_CLIENT_ID: string,
  // GMAIL_CLIENT_SECRET: string,
  // GMAIL_REDIRECT_URI: string,
  // GMAIL_REFRESH_TOKEN: string,
  VUE_APP_FRONTEND_BASE: string,
  RATE_LIMITER_ENABLE: string,
  MONGODB_URI: string
}

const dotenvEnvFile: DotenvEnvFile = {
  NODE_ENV: process.env.NODE_ENV!,
  JWT_SECRET: process.env.JWT_SECRET!,
  // GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID!,
  // GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET!,
  // GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI!,
  // GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN!,
  VUE_APP_FRONTEND_BASE: process.env.VUE_APP_FRONTEND_BASE!,
  RATE_LIMITER_ENABLE: process.env.RATE_LIMITER_ENABLE!,
  MONGODB_URI: process.env.MONGODB_URI!
}

Object.entries(dotenvEnvFile).forEach(([key, value]:[string,string], index:number):void => {
  if (value === undefined) {
    myConsole.log(key, 'is not defined in config. Program will exit')
    process.exit(1)
  }
});

export default dotenvEnvFile


