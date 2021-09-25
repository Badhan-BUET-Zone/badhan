const bodyParser=require('body-parser');
const parseBodyToJSON = (req, res, next) => {
    bodyParser.json()(req, res, err => {
        if (err) {
            return res.status(400).json({
                status:"ERROR",
                message: "Malformed JSON",
            });
        }
        next();
    });
}
module.exports={
    parseBodyToJSON
}
