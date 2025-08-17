const dotenv = require('dotenv');


dotenv.config({ path: process.env.NODE_ENV + ".env"});

module.exports = {
    NODE_ENV : process.env.NODE_ENV
}