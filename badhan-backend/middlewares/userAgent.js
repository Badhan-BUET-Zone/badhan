const useragent = require('useragent');
const userAgentHandler = (req, res, next) => {
    req.userAgent = useragent.parse(req.headers['user-agent']).toString();
    next();
}
module.exports={
    userAgentHandler
}
