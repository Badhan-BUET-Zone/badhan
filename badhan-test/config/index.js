const config = require('../config/config')
const env = {
    SUPERADMIN_PASSWORD: config.SUPERADMIN_PASSWORD,
    SUPERADMIN_PHONE: config.SUPERADMIN_PHONE,
}
Object.keys(env).forEach((key) => {
    if (env[key] === undefined) {
        console.log('BADHAN TEST: ', key, 'is not defined in config. Program will exit')
        process.exit(1)
    }
})
module.exports = env
