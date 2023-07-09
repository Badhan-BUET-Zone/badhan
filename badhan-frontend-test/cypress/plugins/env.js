import env from '../../env/env.development'
// import env from '../../env/env.testing'

const config = {
    SUPERADMIN_PHONE: env.SUPERADMIN_PHONE,
    SUPERADMIN_PASSWORD: env.SUPERADMIN_PASSWORD,
    FRONTEND_URL: env.FRONTEND_URL,
    BACKEND_URL: env.BACKEND_URL
}

Object.keys(config).forEach((key) => {
    if (config[key] === undefined) {
        throw new Error('BADHAN TEST LOG: '+ key+ 'is not defined in config. Program will exit')
    }
})

export default config
