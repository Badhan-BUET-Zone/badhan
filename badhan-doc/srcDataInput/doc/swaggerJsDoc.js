const swaggerJsdoc = require('swagger-jsdoc')
// https://dev.to/kabartolo/how-to-document-an-express-api-with-swagger-ui-and-jsdoc-50do
const controllerDocs = [
  './srcDataInput/index.js'
]

const authDocs = './srcDataInput/middlewares/auth.js'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Badhan Datainput API',
      description: 'Automatically generated documentation of Badhan Datainput API. The backend is documented and currently maintained by Sanju Basak'
    },
    servers: [{
      url: 'https://badhan-datainput-api.herokuapp.com/',
      description: 'Production server'
    },{
      url: 'http://localhost:3000',
      description: 'Local development server'
    },{
      url: 'https://badhan-datainput-api-test.herokuapp.com/',
      description: 'Deployed Test Server'
    }],
    license: {
      name: 'Licensed Under MIT',
      url: 'https://spdx.org/licenses/MIT.html'
    },
    contact: {
      name: 'Sanju Basak',
      url: 'https://buet.ac.bd'
    },
    tags: [
      {
        name: 'Pending Donors',
        description: 'Endpoints for inputting data from students'
      },
    ],
  },
  apis: [authDocs, ...controllerDocs,] // files containing annotations as above
}

const openapiSpecification = swaggerJsdoc(options)
module.exports = {
  openapiSpecification
}
