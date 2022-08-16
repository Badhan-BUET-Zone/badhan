// @ts-nocheck
import { userAgentHandler } from './middlewares/userAgent'
import express from 'express'
import { dotenvEnvFile } from './dotenv'
import { handleJsonBodyParseFailures } from './response/bodyParser'
import cookieParser from 'cookie-parser'
/* tslint:disable */
const logger = require('morgan')
const cors = require('cors')
const apiRouter = require('./routes/donors')
const usersRouter = require('./routes/users')
const donationsRouter = require('./routes/donations')
const guestRouter = require('./routes/guest')
const callRecordRouter = require('./routes/callRecords')
const publicContactsRouter = require('./routes/publicContacts')
const logRouter = require('./routes/logs')
const activeDonorsRouter = require('./routes/activeDonors')
require('./db/mongoose')
const { respond } = require('./response')
const { routeNotFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler, internalServerErrorHandler } = require('./response/errorHandlers')
const { redirectToDoc } = require('./doc/redirection')
const { onlineCheckController } = require('./controllers/otherControllers')
const app = express()

app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use('/doc/', redirectToDoc)
app.use(logger('dev'))
app.use(userAgentHandler)
app.response.respond = respond
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

console.log('BADHAN LOG: server environment is', dotenvEnvFile.NODE_ENV)
console.log('BADHAN LOG: rate limiter', dotenvEnvFile.RATE_LIMITER_ENABLE === 'true' ? 'on' : 'off')

module.exports = app
