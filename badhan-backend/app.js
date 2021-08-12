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
let logRouter = require('./routes/logs');

const { mongoose } = require('./db/mongoose');
// let {responseInterceptor} = require('./middlewares/response');

app.use(logger('dev'));

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

app.use(cors());


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
app.use('/doc/', swaggerUi.serve, swaggerUi.setup(swaggerFile));


// app.use(responseInterceptor);

app.use('/users', usersRouter);
app.use('/donations',donationsRouter);
app.use('/guest', guestRouter);
app.use('/callrecords', callRecordRouter);
app.use('/', apiRouter);
app.use('/',logRouter);

// catch 404 and forward to error handler
app.use('*',(req, res, next)=>{
    return res.status(404).send({
        status: 'ERROR',
        message: 'Route not found'
    });
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    // res.render('error');
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
