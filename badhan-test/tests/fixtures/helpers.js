const api = require('../../api');
const env = require('../../config/config');

const authenticate=async()=>{
    if(api.getToken()===null){
        let user= await api.handlePOSTSignIn({phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
        api.setToken(user.data.token);
    }
}
const processError=(e)=>{
    if(e.response && e.response.data && e.response.data.message){
         throw new Error("axios error : "+e.response.data.message)
    }
    throw e;
}
module.exports={
    authenticate,
    processError,
}