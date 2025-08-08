export default {
  openapi: '3.1.0',
  info: {
    title: 'Badhan API',
    version: '1.0.0',
    description: 'Automatically generated documentation of Badhan API. The backend is documented and currently maintained by Mir Mahathir Mohammad'
  },
  contact: {
    name: 'Mir Mahathir Mohammad',
    url: 'https://mirmahathir.com'
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
  servers: [
    {
      url: 'https://badhan-buet-test.uc.r.appspot.com',
      description: 'Development server'
    },
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }],
  components: { schemas: {} }               // you can $ref these later
};