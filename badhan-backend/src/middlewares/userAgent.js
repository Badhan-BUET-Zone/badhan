const useragent = require('useragent');
const userAgentHandler = (req, res, next) => {
    let agent = useragent.parse(req.headers['user-agent'])
    req.userAgent={
        os:agent.os.toString(),
        device: agent.device.toString(),
        browserFamily: agent.family.toString(),
        ipAddress: req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress
    }
    console.log("useragent os->",req.userAgent.os," device->",req.userAgent.device," family->",req.userAgent.browserFamily," ip->",req.userAgent.ipAddress);
    next();
}
module.exports={
    userAgentHandler
}
