const config = require('../config/config')
const env = {
    SUPERADMIN_ID: config.SUPERADMIN_ID,
    SUPERADMIN_PASSWORD: config.SUPERADMIN_PASSWORD,
    SUPERADMIN_PHONE: config.SUPERADMIN_PHONE,
    SUPERADMIN_HALL: config.SUPERADMIN_HALL,
    VOLUNTEER_PHONE: config.VOLUNTEER_PHONE,
    VOLUNTEER_PASSWORD: config.VOLUNTEER_PASSWORD,
    VOLUNTEER_ID: config.VOLUNTEER_ID,
    VOLUNTEER_HALL: config.VOLUNTEER_HALL
}
Object.keys(env).forEach((key) => {
    if (env[key] === undefined) {
        console.log('BADHAN TEST: ', key, 'is not defined in config. Program will exit')
        process.exit(1)
    }
})
module.exports = env
