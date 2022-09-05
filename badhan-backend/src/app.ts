import { userAgentHandler } from './middlewares/userAgent'
import express, {Express} from 'express'
import dotenv from './dotenv'
import { handleJsonBodyParseFailures } from './response/bodyParser'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import apiRouter from './routes/donors'
import usersRouter from './routes/users'
import donationsRouter from './routes/donations'
import guestRouter from './routes/guest'
import callRecordRouter from './routes/callRecords'
import publicContactsRouter from './routes/publicContacts'
import logRouter from './routes/logs'
import activeDonorsRouter from './routes/activeDonors'
import './db/mongoose'
import { routeNotFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler, internalServerErrorHandler } from './response/errorHandlers'
import { redirectToDoc } from './doc/redirection'
import { onlineCheckController } from './controllers/otherControllers'
import myConsole from "./response/myConsole";

const app:Express = express()

app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use('/doc/', redirectToDoc)
app.use(logger('dev'))
app.use(userAgentHandler)
app.use(express.json())
app.use(handleJsonBodyParseFailures)
app.use('/users', usersRouter)
app.use('/donations', donationsRouter)
app.use('/guest', guestRouter)
app.use('/callrecords', callRecordRouter)
app.use('/publicContacts', publicContactsRouter)
app.use('/activeDonors', activeDonorsRouter)
app.use('/', apiRouter)
app.use('/', logRouter)
app.use('/', onlineCheckController)
app.use('*', routeNotFoundHandler)
app.use(internalServerErrorHandler)
process.on('unhandledRejection', unhandledRejectionHandler)
process.on('uncaughtException', uncaughtExceptionHandler)

myConsole.log('BADHAN LOG: server environment is', dotenv.NODE_ENV)
myConsole.log('BADHAN LOG: rate limiter', dotenv.RATE_LIMITER_ENABLE === 'true' ? 'on' : 'off')

export default app
