// let express = require('express');
import express from 'express'
import dotenv from './dotenv'
const { handleJsonBodyParseFailures } = require('./response/bodyParser')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerFile = require('../swagger_output.json')
const apiRouter = require('./routes/donors')
const usersRouter = require('./routes/users')
const donationsRouter = require('./routes/donations')
const guestRouter = require('./routes/guest')
const callRecordRouter = require('./routes/callRecords')
const publicContactsRouter = require('./routes/publicContacts')
const logRouter = require('./routes/logs')
const activeDonorsRouter = require('./routes/activeDonors')
require('./db/mongoose')
const { userAgentHandler } = require('./middlewares/userAgent')
const { respond } = require('./response')
const { routeNotFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler, internalServerErrorHandler } = require('./response/errorHandlers')

const app = express()
app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use('/doc/', swaggerUi.serve, swaggerUi.setup(swaggerFile))
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
app.use('*', routeNotFoundHandler)
app.use(internalServerErrorHandler)

process.on('unhandledRejection', unhandledRejectionHandler)
process.on('uncaughtException', uncaughtExceptionHandler)

console.log('BADHAN LOG: server environment is', dotenv.NODE_ENV)
console.log('BADHAN LOG: rate limiter', dotenv.RATE_LIMITER_ENABLE === 'true' ? 'on' : 'off')

module.exports = app
