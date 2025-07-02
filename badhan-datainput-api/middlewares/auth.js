const axios = require('axios')

const authenticationMiddleware = async(req, res, next) => {
    const token = req.header('x-auth')

    if(!token){return res.status(400).send({message: "valid x-auth token required", status: "ERROR"})}

    try {
        await axios.get(process.env.AUTH_URL, {headers: {'x-auth': token}})
        next()
    }catch (e) {
        return res.status(401).send({
            message: "Invalid token",
            status: "ERROR",
        })
    }
}

module.exports = {
    authenticationMiddleware
}
