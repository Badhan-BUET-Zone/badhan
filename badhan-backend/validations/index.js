const {validationResult} = require('express-validator');
const {BadRequestError}=require("../response/errorTypes")
const validate = validations => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        return res.sendResponse(new BadRequestError(errors.array()[0].msg));
        // return res.status(400).json({
        //     status:"ERROR",
        //     message: errors.array()[0].msg,
        //     errors:errors.array()
        // });
    };
};

module.exports={
    validate,
}
/*
rules of using express validator
- no asynchronous calls
 */
