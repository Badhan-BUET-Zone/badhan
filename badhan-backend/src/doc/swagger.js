const swaggerAutogen = require('swagger-autogen')()

const doc = {
  info: {
    version: '3.0.0',
    title: 'Badhan API',
    description: 'Automatically generated documentation of Badhan API. The backend is documented and currently maintained by Sumaiya Azad'
  },
  host: 'badhan-web-test.herokuapp.com',
  basePath: '/',
  schemes: ['https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      name: 'User',
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
  securityDefinitions: {
    api_key: {
      type: 'apiKey',
      name: 'x-auth',
      in: 'header'
    }
  },
  definitions: {
    Donors: {
      _id: '5e901d56effc5900177ced73',
      designation: 3,
      lastDonation: 0,
      phone: 8801521438557,
      bloodGroup: 2,
      hall: 5,
      name: 'Mir Mahathir Mohammad',
      studentId: '1605011',
      address: 'Azimpur road',
      roomNumber: 'ME-103',
      comment: 'Designer and developer of Badhan Web and App',
      password: '$2a$10$9B3aSkiguyvukvGQiTMYS89a9vkS',
      commentTime: 1625686709994,
      availableToAll: true,
      email: 'mirmahathir1@gmail.com'
    },
    Donations: {
      _id: '5e6776166f73f925e22a0574',
      phone: 8801746027313,
      date: 1514764800000,
      donorId: '5e6776166f73f925e22a0574'
    },
    CallRecords: {
      _id: '5e6776166f73f925e22a0574',
      date: 1514764800000,
      callerId: '5e6776166f73f925e22a0574',
      calleeId: '5e6776166f73f925e22a0574'
    },
    Logs: {
      _id: '5e6776166f73f925e22a0574',
      donorId: '5e6776166f73f925e22a0574',
      operation: 'CREATE DONOR',
      date: 1514764800000,
      details: {}
    },
    Tokens: {
      _id: '5e6776166f73f925e22a0574',
      token: 'shgreoinghbedoiughewiutb3outgesiuvberugbgneh',
      donorId: '5e6776166f73f925e22a0574'
    },
    PublicContacts: {
      _id: '5e6776166f73f925e22a0574',
      bloodGroup: 2,
      donorId: '5e6776166f73f925e22a0574'
    },
    ActiveDonor: {
      _id: '5e6776166f73f925e22a0574',
      donorId: '5e6776166f73f925e22a0574',
      markerId: '5e6776166f73f925e22a0574',
      time: 123654789
    }
  }
}

const outputFile = './swagger_output.json'
const endpointsFiles = [
  './src/routes/donors.js',
  './src/routes/users.js',
  './src/routes/callRecords.js',
  './src/routes/donations.js',
  './src/routes/logs.js',
  './src/routes/publicContacts.js',
  './src/routes/activeDonors.js'
]

swaggerAutogen(outputFile, endpointsFiles, doc)
