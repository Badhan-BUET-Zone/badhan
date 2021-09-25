const dotenv = require('dotenv')
dotenv.config( { path : './config/config.env'} )

const bodyParser=require('body-parser');
let express = require('express');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let cors = require('cors');
let app = express();


const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./doc/swagger_output.json');

let apiRouter = require('./routes/donors');
let usersRouter = require('./routes/users');
let donationsRouter = require('./routes/donations');
let guestRouter = require('./routes/guest')
let callRecordRouter = require('./routes/callRecords');
let publicContactsRouter = require('./routes/publicContacts');
let logRouter = require('./routes/logs');

const { mongoose } = require('./db/mongoose');
// let {responseInterceptor} = require('./middlewares/response');
const {userAgentHandler} = require('./middlewares/userAgent');
const {sendResponse} = require('./response')


app.use(cors());

// app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
app.use('/doc/', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use(logger('dev'));

app.use(userAgentHandler);

app.response.sendResponse = sendResponse;

app.use((req, res, next) => {
    bodyParser.json()(req, res, err => {
        if (err) {
            return res.status(400).json({
                status:"ERROR",
                message: "Malformed JSON",
            });
        }
        next();
    });
});
// app.use(responseInterceptor);

app.use('/users', usersRouter);
app.use('/donations',donationsRouter);
app.use('/guest', guestRouter);
app.use('/callrecords', callRecordRouter);
app.use('/publicContacts',publicContactsRouter);
app.use('/', apiRouter);
app.use('/',logRouter);

// catch 404 and forward to error handler
app.use('*',(req, res, next)=>{
    return res.status(404).send({
        status: 'ERROR',
        message: 'Route not found'
    });
});

process.on('SIGINT', async function () {
    console.error('SIGINT called');
    await mongoose.disconnect();
    console.error('Mongoose connection terminated');
    process.exit(0);
});

process.on('SIGTERM', async function () {
    console.error('SIGTERM called');
    await mongoose.disconnect();
    console.error('Mongoose connection terminated');
    process.exit(0);
});


module.exports = app;
