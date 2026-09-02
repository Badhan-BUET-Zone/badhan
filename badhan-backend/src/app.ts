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
import { mcpRouter } from './mcp/router'

const app:Express = express()

// Content-Disposition has to be named explicitly: a browser hides every response header from
// cross-origin JavaScript except a short safelist, and the frontend is a different origin from this
// API in every environment. Without this the certificate page can read the PDF but not the filename
// the backend chose for it, and quietly saves the file under the donor's database id instead.
app.use(cors({ exposedHeaders: ['Content-Disposition'] }))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// POST /mcp/<token> carries a Badhan token in the URL, because claude.ai's and ChatGPT's
// connectors take a URL and have nowhere to type a header. Morgan prints the raw URL of every
// request on stdout, which on App Engine is Cloud Logging — so the token is stripped here, at
// the source. Registered BEFORE app.use(logger('dev')): morgan resolves its tokens at mount
// time, and overriding one afterwards changes nothing.
//
// App Engine's own request log is a different matter: the platform writes an access-log entry
// per request with the full path and no application code can redact it. That is accepted rather
// than solved, and the reasoning is worth keeping so nobody "fixes" it later with a token store
// nobody wants. Reading those logs needs a Logs Viewer role on the GCP project, and anyone
// holding that can already read the database — the token discloses nothing to them they did not
// have. It also expires on its own, in 30 minutes by default and 24 hours at the outside, while
// the log entry is retained far longer: what sits in the log is a dead credential within a day.
// The alternative — an opaque handle with a stored mapping — is a whole new credential class
// with its own lifecycle and revocation, which is not worth it for a risk whose holder is
// already an administrator.
logger.token('url', (req: Request): string =>
  req.originalUrl.replace(/^\/mcp\/.+$/, '/mcp/<redacted>'))
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

// After RegisterRoutes and BEFORE the catch-all, which would otherwise swallow it. Placement
// after express.json() is required rather than incidental: the body arrives parsed. The router
// takes the app because the dispatcher replays tool calls through it — a circular-looking
// dependency that is really late binding, and passing it explicitly is what keeps dispatch.ts
// free of an import back into this file.
app.use('/mcp', mcpRouter(app))

app.use('*', routeNotFoundHandler)
app.use(internalServerErrorHandler)
process.on('unhandledRejection', unhandledRejectionHandler)
process.on('uncaughtException', uncaughtExceptionHandler)

myConsole.log('server environment is', dotenv.NODE_ENV)
myConsole.log('rate limiter', dotenv.RATE_LIMITER_ENABLE === 'true' ? 'on' : 'off')

export default app
