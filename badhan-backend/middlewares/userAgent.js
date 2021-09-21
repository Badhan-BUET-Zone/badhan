const useragent = require('useragent');
const userAgentHandler = (req, res, next) => {
    let agent = useragent.parse(req.headers['user-agent'])
    req.userAgent={
        os:agent.os.toString(),
        device: agent.device.toString(),
        family: agent.family.toString(),
        ip: req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress
    }
    console.log("useragent os->",req.userAgent.os," device->",req.userAgent.device," family->",req.userAgent.family," ip->",req.userAgent.ip);
    next();
}
module.exports={
    userAgentHandler
}
