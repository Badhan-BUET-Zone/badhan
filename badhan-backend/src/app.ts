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
// Badhan Agent reports each API result it ran to PUT /agent/chats/{chatId}/toolCalls/{toolCallId},
// and one result may carry up to 250 KB of response for display. That one path gets a 1 MB parser,
// placed first so the global one below sees the body already parsed and leaves it alone. Every
// other route keeps express's default 100 KB.
app.use(/^\/agent\/chats\/[^/]+\/toolCalls\/[^/]+\/?$/, express.json({ limit: '1mb' }))
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
