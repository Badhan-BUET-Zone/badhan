import axios from 'axios'
import {USERS_ME, USERS_SIGNIN, USERS_SIGNOUT} from "./model";
import {store} from "../store";

export const badhanAxios = axios.create({baseURL: 'https://badhan-buet.uc.r.appspot.com/'})
export const badhanAdminAxios = axios.create({baseURL: 'https://badhan-admin-api.herokuapp.com/'})
const firebaseAxios = axios.create({
    baseURL: 'https://badhan-buet-default-rtdb.firebaseio.com'
})


badhanAxios.interceptors.request.use((config) => {
    // Do something before request is sent
    console.log('%cREQUEST TO ' + config.method + ' ' + config.url + ': ', 'color: #ff00ff', config.data, config.params)
    const token = store.getState().userProfile.token
    if(token){
        config.headers = {
            'x-auth': token
        }
    }

    return config
}, function (error) {
    // Do something with request error
    return Promise.reject(error)
})

badhanAxios.interceptors.response.use((response) => {
    // Do something before request is sent
    console.log('%cRESPONSE FROM ' + response.config.method + ' ' + response.config.url + ': ', 'color: #00ff00', response)
    return response
}, (error) => {
    // Do something with request error
    console.log('Axios Error:', error?.response?.data)
    return Promise.reject(error)
})

firebaseAxios.interceptors.request.use((config) => {
    // Do something before request is sent
    console.log('%cREQUEST TO ' + config.url + ': ', 'color: #ff00ff', config.data)
    return config
}, function (error) {
    // Do something with request error
    return Promise.reject(error)
})

firebaseAxios.interceptors.response.use((response) => {
    // Do something before request is sent
    console.log('%cRESPONSE FROM ' + response.config.url + ': ', 'color: #00ff00', response)
    return response
}, (error) => {
    // Do something with request error
    return Promise.reject(error)
})

export const handlePOSTUsersSignIn = async (payload: {phone: string, password: string}) => {
    try{
        return await badhanAxios.post(USERS_SIGNIN,{phone: payload.phone, password: payload.password},{})
    }catch (e:any) {
        return e.response
    }
}

export const handleDELETEUsersSignOut = async () => {
    try {
        return await badhanAxios.delete(USERS_SIGNOUT)
    }catch (e:any) {
        return e.response
    }
}

export const handleGETUsersMe = async () => {
    try {
        return await badhanAxios.get(USERS_ME)
    }catch (e: any) {
        return e.response
    }
}

export const handlePATCHUsersRedirection = async (payload: {token: string}) => {
    try{
        return await badhanAxios.patch('/users/redirection',{token: payload.token})
    }catch (e:any) {
        return e.response
    }
}

export const handleGETLogVersion = async () => {
    try{
        return await badhanAxios.get('/log/version/v5')
    }catch (e:any) {
        return e.response
    }
}

export const handleGETDonorsDesignation = async () => {
    try {
        return await badhanAxios.get('/donors/designation')
    }catch (e:any){
        return e.response
    }
}

export const handleGETCredits = async () => {
    try {
        return await firebaseAxios.get('/contributors.json')
    } catch (e: any) {
        return e.response
    }
}
