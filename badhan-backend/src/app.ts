import 'reflect-metadata'
import { userAgentHandler } from './middlewares/userAgent'
import express, {Express} from 'express'
import dotenv from './dotenv'
import { handleJsonBodyParseFailures } from './response/bodyParser'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import './db/mongoose'
import { routeNotFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler, internalServerErrorHandler } from './response/errorHandlers'
import myConsole from "./utils/myConsole";
import swaggerUi from 'swagger-ui-express';
import { RegisterRoutes } from './tsoaRoutes/routes'
import { Request, Response } from 'express';
import path from 'node:path';

const app:Express = express()

// Content-Disposition has to be named explicitly: a browser hides every response header from
// cross-origin JavaScript except a short safelist, and the frontend is a different origin from this
// API in every environment. Without this the certificate page can read the PDF but not the filename
// the backend chose for it, and quietly saves the file under the donor's database id instead.
app.use(cors({ exposedHeaders: ['Content-Disposition'] }))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(logger('dev'))




app.use(userAgentHandler)
app.use(express.json())
app.use(handleJsonBodyParseFailures)

// TSOA generated routes registration
RegisterRoutes(app)

// Serve TSOA OpenAPI spec JSON
app.get('/openapi.json', (_req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, 'tsoa', 'swagger.json'))
})

// Serve TSOA Swagger UI
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, { explorer: true, swaggerUrl: '/openapi.json' })
)

app.use('*', routeNotFoundHandler)
app.use(internalServerErrorHandler)
process.on('unhandledRejection', unhandledRejectionHandler)
process.on('uncaughtException', uncaughtExceptionHandler)

myConsole.log('server environment is', dotenv.NODE_ENV)
myConsole.log('rate limiter', dotenv.RATE_LIMITER_ENABLE === 'true' ? 'on' : 'off')

export default app
