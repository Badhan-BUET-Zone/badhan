import 'reflect-metadata'
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
import plateletDonationsRouter from './routes/plateletDonations'
import guestRouter from './routes/guest'
import callRecordRouter from './routes/callRecords'
import publicContactsRouter from './routes/publicContacts'
import logRouter from './routes/logs'
import testRouter from './routes/test'
import activeDonorsRouter from './routes/activeDonors'
import './db/mongoose'
import { routeNotFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler, internalServerErrorHandler } from './response/errorHandlers'
import { onlineCheckController } from './controllers/otherControllers'
import myConsole from "./utils/myConsole";
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import redoc from 'redoc-express';
import swaggerDef from './doc/swaggerDef';
import { RegisterRoutes } from './tsoaRoutes/routes'
import { OpenAPIV3 } from 'openapi-types';
import { Request, Response } from 'express';
import path from 'node:path';

const swaggerSpec: OpenAPIV3.Document = swaggerJsdoc({
  definition: swaggerDef,
  apis: ['./src/routes/*.ts', './src/middlewares/*.ts',  './src/db/models/*.ts'],
}) as unknown as OpenAPIV3.Document;

const app:Express = express()

app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(logger('dev'))




app.use(userAgentHandler)
app.use(express.json())
app.use(handleJsonBodyParseFailures)

app.get(
  '/openapi.json',
  (_req: Request, res: Response): Response => res.json(swaggerSpec)
);

// Serve legacy swagger-jsdoc UI with isolated assets
app.use(
  '/docs',
  swaggerUi.serveFiles(swaggerSpec, { explorer: true }),
  swaggerUi.setup(swaggerSpec, { explorer: true })
);
// TSOA generated routes registration (placed before existing routers to override /users/signin)
RegisterRoutes(app)

// Serve TSOA OpenAPI spec JSON and UI at separate URLs
app.get('/tsoa-openapi.json', (_req: Request, res: Response): void => {
  // Serve TSOA-generated spec directly
  res.sendFile(path.join(__dirname, 'tsoa', 'swagger.json'))
})

// Serve TSOA UI from merged JSON endpoint
app.use(
  '/tsoa-docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, { explorer: true, swaggerUrl: '/tsoa-openapi.json' })
)


// 4) Redoc (clean reference view)
app.get(
  '/redoc',
  redoc({
    title: 'API Reference',
    specUrl: '/openapi.json'
  })
);

app.use('/users', usersRouter)
app.use('/donations', donationsRouter)
app.use('/platelet-donations', plateletDonationsRouter)
app.use('/guest', guestRouter)
app.use('/callrecords', callRecordRouter)
app.use('/publicContacts', publicContactsRouter)
app.use('/activeDonors', activeDonorsRouter)
app.use('/test', testRouter)
app.use('/', apiRouter)
app.use('/', logRouter)
app.use('/', onlineCheckController)
app.use('*', routeNotFoundHandler)
app.use(internalServerErrorHandler)
process.on('unhandledRejection', unhandledRejectionHandler)
process.on('uncaughtException', uncaughtExceptionHandler)

myConsole.log('server environment is', dotenv.NODE_ENV)
myConsole.log('rate limiter', dotenv.RATE_LIMITER_ENABLE === 'true' ? 'on' : 'off')

export default app
