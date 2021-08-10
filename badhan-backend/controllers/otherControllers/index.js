const deprecatedController = async(req,res,next)=>{
    return res.status(426).send({
        status: 'ERROR',
        message: "Please update your app for this feature"
    });
}

module.exports = {
    deprecatedController
}
