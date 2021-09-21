const useragent = require('useragent');
const userAgentHandler = (req, res, next) => {
    let agent = useragent.parse(req.headers['user-agent'])
    req.userAgent={
        os:agent.os.toString(),
        device: agent.device.toString(),
        ip: req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress
    }
    console.log("useragent os->",req.userAgent.os," device->",req.userAgent.device," ip->",req.userAgent.ip);
    next();
}
module.exports={
    userAgentHandler
}
