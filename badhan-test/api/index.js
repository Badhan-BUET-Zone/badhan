/*
This module handles all necessary tasks to communicate with the backend.
Current active backends are- an express app and firebase realtime database
 */
const axios = require('axios');

// const baseURL = "https://badhan-web-test.herokuapp.com";
// const baseURL = "http://localhost:3000";
const baseURL = "http://host.docker.internal:3000"

const badhanAxios = axios.create({
    baseURL
});

const enableGuestAPI = () => {
    badhanAxios.defaults.baseURL += '/guest';
}

const resetBaseURL = () => {
    badhanAxios.defaults.baseURL = baseURL
}

const isGuestEnabled = () => {
    return badhanAxios.defaults.baseURL.includes("/guest");
}

const firebaseAxios = axios.create({
    baseURL: 'https://badhan-buet-default-rtdb.firebaseio.com'
});

badhanAxios.interceptors.request.use((config) => {
    // console.log("%cREQUEST TO " + config.method + " " + config.url + ": ", 'color: #ff00ff', config.data, config.params);
    //
    // config.headers = {
    //     'x-auth': token
    // }
    return config;
}, function (error) {
    // Do something with request error
    return Promise.reject(error);
});

badhanAxios.interceptors.response.use((response) => {
    // Do something before request is sent
    // console.log("%cRESPONSE FROM " + response.config.method + " " + response.config.url + ": ", 'color: #00ff00', response);

    return response;
}, (error) => {
    // Do something with request error
    return Promise.reject(error);
});

firebaseAxios.interceptors.request.use((config) => {
    // Do something before request is sent
    // console.log("%cREQUEST TO " + config.url + ": ", 'color: #ff00ff', config.data);
    return config;
}, function (error) {
    // Do something with request error
    return Promise.reject(error);
});

firebaseAxios.interceptors.response.use((response) => {
    // Do something before request is sent
    // console.log("%cRESPONSE FROM " + response.config.url + ": ", 'color: #00ff00', response);
    return response;
}, (error) => {
    // Do something with request error
    return Promise.reject(error);
});

/////////////////////////ROUTES////////////////////////////////////////////////////
/*
CONVENTIONS TO BE FOLLOWED
* No notifications will be sent from here
* Return response in case of successful api calls and return error.response in case of error cases.
* Method names must match with the corresponding route controller of backend
* Always send an object as payload in these methods
* All API calls must be done from this file
 */

module.exports= {
    badhanAxios,
    firebaseAxios,
    enableGuestAPI,
    resetBaseURL,
    isGuestEnabled,
}
