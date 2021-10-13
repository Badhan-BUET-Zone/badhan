/*
This module handles all necessary tasks to communicate with the backend.
Current active backends are- an express app and firebase realtime database
 */
const axios = require('axios');
let token=null;

const setToken = (authToken) =>{
    token = authToken;
}
const getToken = () =>{
    return token;
}
const baseURL = "https://badhan-web-test.herokuapp.com";

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

// badhanAxios.interceptors.request.use((config) => {
    // Do something before request is sent
    // console.log("%cREQUEST TO " + config.method + " " + config.url + ": ", 'color: #ff00ff', config.data, config.params);
    
    // config.headers = {
    //     'x-auth': token
    // }
//     return config;
// }, function (error) {
//     // Do something with request error
//     return Promise.reject(error);
// });

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

const handlePATCHDonorsDesignation = async (payload) => {
    try {
        return await badhanAxios.patch("/donors/designation", payload);
    } catch (e) {
        return e.response;
    }
}
const handlePATCHUsersPassword = async (payload) => {
    try {
        return await badhanAxios.patch("/users/password", payload);
    } catch (e) {
        return e.response;
    }
}
const handleDELETEDonors = async (payload) => {
    try {
        return await badhanAxios.delete("/donors", {params: payload});
    } catch (e) {
        return e.response;
    }
}

const handlePOSTDonorsPasswordRequest = async (payload) => {
    try {
        return await badhanAxios.post('/donors/password', payload);
    } catch (e) {
        return e.response;
    }
}

const handleGETDonorsDuplicate = async (payload) => {
    try {
        return await badhanAxios.get('/donors/checkDuplicate', {params: payload});
    } catch (e) {
        return e.response;
    }
}
const handleGETLogsByDate = async (payload) => {
    try {
        return await badhanAxios.get(`/log/date/${payload.timeStamp}`);
    } catch (e) {
        return e.response;
    }
}
const handleGETLogs = async () => {
    try {
        return await badhanAxios.get('/log');
    } catch (e) {
        return e.response;
    }
}
const handleDELETESignOut = async () => {
    try {
        return await badhanAxios.delete('/users/signout', {});;
    } catch (e) {
        return e.response;
    }
}
const handleDELETESignOutAll = async () => {
    try {
        return await badhanAxios.delete('/users/signout/all');
    } catch (e) {
        return e.response;
    }
}
const handlePOSTRedirection = async () => {
    try {
        return await badhanAxios.post('/users/redirection');
    } catch (e) {
        return e.response;
    }
}
const handlePATCHRedirectedAuthentication = async (payload) => {
    try {
        return await badhanAxios.patch('/users/redirection', payload);
    } catch (e) {
        return e.response;
    }
}
const handleGETDonorsMe = async () => {
    try {
        return await badhanAxios.get('/donors/me');
    } catch (e) {
        return e.response;
    }
}
const handlePOSTSignIn = async (payload) => {
    try {
        return await badhanAxios.post('/users/signin', payload);
    } catch (e) {
        return e.response;
    }
}
const handleGETVolunteers = async () => {
    try {
        return await badhanAxios.get('/volunteers');
    } catch (e) {
        return e.response;
    }
}
const handlePOSTDonors = async (payload) => {
    try {
        return await badhanAxios.post("/donors", payload);
    } catch (e) {
        return e.response;
    }
}
const handlePOSTDonations = async (payload) => {
    try {
        return await badhanAxios.post("/donations", payload)
    } catch (e) {
        return e.response;
    }
}
const handleGETDonors = async (payload) => {
    try {
        return await badhanAxios.get('/donors', {params: payload});
    } catch (e) {
        return e.response;
    }
}
const handleGETSearchOptimized = async (payload) => {
    try {
        return await badhanAxios.get('/search/v2', {params: payload});
    } catch (e) {
        return e.response;
    }
}
const handleGETAppVersion = async () => {
    try {
        return await badhanAxios('/log/version');
    } catch (e) {
        return e.response;
    }
}
const handleGETStatistics = async () => {
    try {
        return await badhanAxios.get('/log/statistics');
    } catch (e) {
        return e.response;
    }
}
const handleDELETELogs = async () => {
    try {
        return await badhanAxios.delete('/log');
    } catch (e) {
        return e.response;
    }
}
const handleGETVolunteersAll = async () => {
    try {
        return await badhanAxios.get('/volunteers/all');
    } catch (e) {
        return e.response;
    }
}

const handleGETLogsByDateAndDonor = async (payload) => {
    try {
        return await badhanAxios.get(`/log/date/${payload.timeStamp}/donorId/${payload.donorId}`);
    } catch (e) {
        return e.response;
    }
}

const handlePATCHDonorsComment = async (payload) => {
    try {
        return await badhanAxios.patch("/donors/comment", payload);
    } catch (e) {
        return e.response;
    }
}
const handlePATCHDonors = async (payload) => {
    try {
        return await badhanAxios.patch("/donors/v2", payload);
    } catch (e) {
        return e.response;
    }
}
const handlePATCHAdmins = async (payload) => {
    try {
        return await badhanAxios.patch('/admins', payload);
    } catch (e) {
        return e.response;
    }
}
const handleGETAdmins = async () => {
    try {
        return await badhanAxios.get('/admins');
    } catch (e) {
        return e.response;
    }
}
const handleDELETEDonations = async (payload) => {
    try {
        return await badhanAxios.delete("/donations", {params: payload});
    } catch (e) {
        return e.response;
    }
}
const handlePOSTCallRecord = async (payload) => {
    try {
        return await badhanAxios.post("/callrecords", payload);
    } catch (e) {
        return e.response;
    }
}
const handleDELETECallRecord = async (payload) => {
    try {
        return await badhanAxios.delete("/callrecords",{params:payload});
    } catch (e) {
        return e.response;
    }
}

const handlePOSTPasswordForgot = async (payload)=>{
    try{
        return await badhanAxios.post("/users/password/forgot",{phone: payload.phone});
    }catch (e) {
        return e.response;
    }
}
const handleGETDonorsDesignation = async()=>{
    try{
        return await badhanAxios.get('/donors/designation');
    }catch (e) {
        return e.response;
    }
}

const handleGETPublicContacts = async()=>{
    try{
        return await badhanAxios.get('/publicContacts')
    }catch (e) {
        return e.response;
    }
}
const handlePOSTPublicContacts = async(payload)=>{
    try{
        return await badhanAxios.post('/publicContacts',payload);
    }catch (e) {
        return e.response;
    }
}
const handleDELETEPublicContacts = async(payload)=>{
    try{
        return await badhanAxios.delete('/publicContacts',{params: payload});
    }catch (e) {
        return e.response;
    }
}

const handleGETLogins = async()=>{
    try{
        return await badhanAxios.get('/users/logins')
    }catch(e){
        return e.response;
    }
}

const handleDELETELogins = async(payload)=>{
    try{
        return await badhanAxios.delete(`/users/logins/${payload.tokenId}`);
    }catch (e) {
        return e.response;
    }
}

//////////////////////////FIREBASE API CALLS ////////////////////////
const handleGETCredits = async () => {
    try {
        return await firebaseAxios.get('/contributors.json');
    } catch (e) {
        return e.response;
    }
}
module.exports= {
    badhanAxios,
    firebaseAxios,
    enableGuestAPI,
    resetBaseURL,
    isGuestEnabled,
    setToken,
    getToken,
    ///////////////////ROUTES////////////
    handlePATCHDonorsDesignation,
    handlePATCHUsersPassword,
    handleDELETEDonors,
    handlePOSTDonorsPasswordRequest,
    handleGETDonorsDuplicate,
    handleGETLogsByDate,
    handleGETLogs,
    handleDELETESignOut,
    handleDELETESignOutAll,
    handlePOSTRedirection,
    handlePATCHRedirectedAuthentication,
    handleGETDonorsMe,
    handlePOSTSignIn,
    handleGETVolunteers,
    handlePOSTDonors,
    handlePOSTDonations,
    handleGETDonors,
    handleGETSearchOptimized,
    handleGETAppVersion,
    handleGETStatistics,
    handleDELETELogs,
    handleGETVolunteersAll,
    handleGETCredits,
    handleGETLogsByDateAndDonor,
    handlePATCHDonorsComment,
    handlePATCHDonors,
    handlePATCHAdmins,
    handleGETAdmins,
    handleDELETEDonations,
    handlePOSTCallRecord,
    handleDELETECallRecord,
    handlePOSTPasswordForgot,
    handleGETDonorsDesignation,
    handleGETPublicContacts,
    handlePOSTPublicContacts,
    handleDELETEPublicContacts,
    handleGETLogins,
    handleDELETELogins
}
