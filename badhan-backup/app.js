const express = require('express')
require('./dotenv')
require('./mongotools')
const { handleJsonBodyParseFailures } = require('./response/bodyParser')
const { routeNotFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler, internalServerErrorHandler } = require('./response/errorHandlers')

const routes = require('./routes')

const cookieParser = require('cookie-parser')
const logger = require('morgan')
const cors = require('cors')
const fsExtra = require("fs-extra");
const app = express()

app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(logger('dev'))

app.use(express.json())
app.use(handleJsonBodyParseFailures)

app.use((req,res,next)=>{
    console.log("cleaning up backup directory")
    fsExtra.emptyDirSync('backup')
    next()
})

app.use('/',routes)

app.use('*', routeNotFoundHandler)
app.use(internalServerErrorHandler)

process.on('unhandledRejection', unhandledRejectionHandler)
process.on('uncaughtException', uncaughtExceptionHandler)

app.listen(4000, () => {
    console.log(`Backup api is listening on port ${4000}. Please visit https://badhan-admin.web.app/backup-restore`)
})
