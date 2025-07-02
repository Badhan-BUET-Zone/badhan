import dotenv from "../dotenv";
import mongoose, {ConnectOptions} from 'mongoose'
import myConsole from "../utils/myConsole";

mongoose.Promise = global.Promise

myConsole.log('Connecting to ' + (String(dotenv.MONGODB_URI).includes('Test') ? 'Test' : 'Production') + ' database...')

const connectToDB = async (): Promise<void> => {
  try {
    await mongoose.connect(dotenv.MONGODB_URI);
    myConsole.log('You are connected to the database.');
  } catch (e: any) {
    myConsole.log(e.message);
    process.exit();
  }
}

connectToDB()

process.on('SIGINT', async ():Promise<void>=>{
  myConsole.error('SIGINT called')
  await mongoose.disconnect()
  myConsole.error('Mongoose connection terminated')
  process.exit(0)
})

process.on('SIGTERM', async ():Promise<void>=>{
  myConsole.error('SIGTERM called')
  await mongoose.disconnect()
  myConsole.error('Mongoose connection terminated')
  process.exit(0)
})

module.exports = { mongoose }
