const {Token} = require('../models/Token');

const addToken = async (donorId, token) => {
    try {
        let tokenData = new Token({donorId, token});
        let data = await tokenData.save();
        if (data.nInserted === 0) {
            return {
                message: 'Token insertion failed',
                status: 'ERROR',
                data: data,
            }
        } else {
            return {
                message: 'Token insertion successful',
                status: 'OK',
                data: data,
            };
        }
    } catch (e) {
        console.log("ERROR");
        console.log(e.message);
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
};

const findTokenDataByToken = async (token)=>{
    try {
        let tokenData = await Token.findOne({token})

        if(tokenData===null){
            return {
                message: 'Token not found',
                status: 'ERROR'
            }
        }

        return{
            message: 'Token found successfully',
            status: 'OK',
            data: tokenData
        }
        // if (data.nInserted === 0) {
        //     return {
        //         message: 'Token insertion failed',
        //         status: 'ERROR',
        //         data: data,
        //     }
        // } else {
        //     return {
        //         message: 'Token insertion successful',
        //         status: 'OK',
        //         data: data,
        //     };
        // }
    } catch (e) {
        console.log("ERROR")
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
}

const deleteTokenDataByToken = async(token)=>{
    try{
        let tokenData = await Token.findOneAndDelete({token});

        if(tokenData){
            return{
                message: "Token successfully removed",
                status: "OK"
            }
        }

        return{
            message: "Token not found",
            status: "ERROR"
        }

    }catch (e) {
        console.log("ERROR")
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
}

const deleteAllTokensByDonorId = async (donorId)=>{
    try{
        let tokenData = await Token.deleteMany({donorId});
        return{
            message: "Token successfully removed",
            status: "OK"
        }
    }catch (e) {
        console.log("ERROR")
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
}

module.exports = {
    addToken,
    findTokenDataByToken,
    deleteTokenDataByToken,
    deleteAllTokensByDonorId
}
