const swaggerJsdoc = require('swagger-jsdoc')
// https://dev.to/kabartolo/how-to-document-an-express-api-with-swagger-ui-and-jsdoc-50do
const controllerDocs = [
  './src/controllers/userController.js',
  './src/controllers/donorController.js',
  './src/controllers/activeDonorController.js',
  './src/controllers/callRecordController.js',
  './src/controllers/donationController.js',
  './src/controllers/logController.js',
  './src/controllers/publicContactController.js',
]
const dbModelDocs = [
  './src/db/index.js',
]

const authDocs = './src/middlewares/authenticate.js'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      version: '4.0.0',
      title: 'Badhan API',
      description: 'Automatically generated documentation of Badhan API. The backend is documented and currently maintained by Sumaiya Azad'
    },
    servers: [{
      url: 'https://badhan-web-test.herokuapp.com',
      description: 'Development server'
    },{
      url: 'http://localhost:3000',
      description: 'Local development server'
    }],
    license: {
      name: 'Licensed Under MIT',
      url: 'https://spdx.org/licenses/MIT.html'
    },
    contact: {
      name: 'Mir Mahathir Mohammad',
      url: 'https://buet.ac.bd'
    },
    tags: [
      {
        name: 'Users',
        description: 'Authentication Endpoints'
      },
      {
        name: 'Donors',
        description: 'Routes to handle donors'
      },
      {
        name: 'Logs',
        description: 'Fetch statistics about backend'
      },
      {
        name: 'Call Records',
        description: 'Fetch call records of donors'
      },
      {
        name: 'Public Contacts',
        description: 'Contacts of Badhan that are available to the public'
      },
      {
        name: 'Active Donors',
        description: 'Management of all active donors'
      }
    ],
  },
  apis: [authDocs, ...controllerDocs, ...dbModelDocs] // files containing annotations as above
}

const openapiSpecification = swaggerJsdoc(options)
module.exports = {
  openapiSpecification
}
