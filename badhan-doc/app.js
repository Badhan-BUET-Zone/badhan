var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const swaggerJsDoc = require('./src/doc/swaggerJsDoc')
const swaggerUi = require('swagger-ui-express')
var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', swaggerUi.serveFiles(swaggerJsDoc.openapiSpecification), swaggerUi.setup(swaggerJsDoc.openapiSpecification))


module.exports = app;
