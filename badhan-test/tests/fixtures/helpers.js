const processError=(e)=>{
    if(e.response && e.response.data && e.response.data.message){
         throw new Error("axios error : "+e.response.data.message+", url: "+e.response.config.url)
    }
    throw e;
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports={
    processError,
    sleep
}
