const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )

const env = process.env.NODE_ENV || 'development';

if (env === 'development') {
    MONGODB_URI = "mongodb://localhost:27017/Badhan"
}

const exec = require('child_process').exec;
const fs = require('fs');
const colors = require('colors');
const errorHandler = require('./middleware/error');
const history = require('connect-history-api-fallback');
const bodyParser=require('body-parser');
let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let cors = require('cors');



let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');

const { mongoose } = require('./db/mongoose');

// //Load Models 
// const Product = require('./db/models/product').Product
// //Emptying the database
// Product.collection.deleteMany()
// console.log("Data deleted".red.inverse);


let app = express();

//SPA Handling
app.use(express.static(path.join(__dirname, 'public')));
// app.use(history());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(cors());


// app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use( errorHandler )


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
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
    
    //todo shift from console.error to something more...reasonable
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
