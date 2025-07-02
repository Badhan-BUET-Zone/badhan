const processError = (e) => {
    if (e.response && e.response.data) {
        const consoleErrorPrint = {
            url: "",
            data: e.response.data,
            stack: e.stack
        }
        if (e.response.config) {
            consoleErrorPrint.url = e.response.config.url
        }
        throw new Error(JSON.stringify(consoleErrorPrint, null, 2));
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
