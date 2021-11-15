require('./dotenv');
const {handleJsonBodyParseFailures} = require('./response/bodyParser')
// let express = require('express');
import express from 'express'
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('../swagger_output.json');
let apiRouter = require('./routes/donors');
let usersRouter = require('./routes/users');
let donationsRouter = require('./routes/donations');
let guestRouter = require('./routes/guest')
let callRecordRouter = require('./routes/callRecords');
let publicContactsRouter = require('./routes/publicContacts');
let logRouter = require('./routes/logs');
let activeDonorsRouter = require('./routes/activeDonors');
require('./db/mongoose');
const {userAgentHandler} = require('./middlewares/userAgent');
const {respond} = require('./response')
const {routeNotFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler, internalServerErrorHandler} = require('./response/errorHandlers')

let app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/doc/', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(logger('dev'));
app.use(userAgentHandler);
app.response.respond = respond;
app.use(express.json());
app.use(handleJsonBodyParseFailures)

app.use('/users', usersRouter);
app.use('/donations',donationsRouter);
app.use('/guest', guestRouter);
app.use('/callrecords', callRecordRouter);
app.use('/publicContacts',publicContactsRouter);
app.use('/activeDonors',activeDonorsRouter);
app.use('/', apiRouter);
app.use('/',logRouter);
app.use('*',routeNotFoundHandler);
app.use(internalServerErrorHandler);


process.on('unhandledRejection', unhandledRejectionHandler);
process.on('uncaughtException', uncaughtExceptionHandler);

console.log("BADHAN LOG: server environment is",process.env.NODE_ENV);
console.log("BADHAN LOG: rate limiter",process.env.RATE_LIMITER_ENABLE==='true'?'on':'off');

module.exports = app;
