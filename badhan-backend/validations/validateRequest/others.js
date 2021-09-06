const checkEmail = (email)=>{
    let emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
    return emailRegex.test(email);
}

module.exports={
    checkEmail
}
