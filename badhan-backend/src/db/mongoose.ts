import dotenv from "../dotenv";
import mongoose, {ConnectOptions} from 'mongoose'

mongoose.Promise = global.Promise

// tslint:disable-next-line:no-console
console.log('BADHAN LOG: Connecting to ' + (String(dotenv.MONGODB_URI).includes('Test') ? 'Test' : 'Production') + ' database...')

const connectToDB = async () => {
  try {
    mongoose.connect(dotenv.MONGODB_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true
    } as ConnectOptions, () => {
      // tslint:disable-next-line:no-console
      console.log('BADHAN LOG: You are connected to the database.')
    })
  } catch (e: any) {
    // tslint:disable-next-line:no-console
    console.log(e.message)
    process.exit()
  }
}

connectToDB()

process.on('SIGINT', async ()=>{
  // tslint:disable-next-line:no-console
  console.error('SIGINT called')
  await mongoose.disconnect()
  // tslint:disable-next-line:no-console
  console.error('Mongoose connection terminated')
  process.exit(0)
})

process.on('SIGTERM', async ()=>{
  // tslint:disable-next-line:no-console
  console.error('SIGTERM called')
  await mongoose.disconnect()
  // tslint:disable-next-line:no-console
  console.error('Mongoose connection terminated')
  process.exit(0)
})

module.exports = { mongoose }
