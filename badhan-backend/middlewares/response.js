const responseInterceptor = (req, res, next) => {
    let oldSend = res.send
    res.send = async (data)=>{

        res.send = oldSend // set function back to avoid the 'double-send'
        return res.send(data) // just call as normal with data
    }
    next();
}
module.exports = {
    responseInterceptor
}
