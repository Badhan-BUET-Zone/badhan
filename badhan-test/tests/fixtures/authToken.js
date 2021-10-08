const api = require('../../api');
const env = require('../../config/config');

const authenticate=async()=>{
    console.log('hiiii');
        let user= await api.handlePOSTSignIn({phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
        api.setToken(user.data.token);
        console.log('hi2');
}

module.exports={
    authenticate
}