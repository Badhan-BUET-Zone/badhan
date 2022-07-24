import axios from 'axios'
import {USERS_SIGNIN, USERS_SIGNOUT} from "./model";
import {useSelector} from "react-redux";
import {UserProfileModel} from "../store/userProfileModel";
import {store} from "../store";

export const badhanAxios = axios.create({baseURL: 'https://badhan-buet.uc.r.appspot.com/'})
export const badhanAdminAxios = axios.create({baseURL: 'https://badhan-admin-api.herokuapp.com/'})



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

export const handleUsersSignIn = async (payload: {phone: string, password: string}) => {
    try{
        return await badhanAxios.post(USERS_SIGNIN,{phone: payload.phone, password: payload.password},{})
    }catch (e:any) {
        return e.response
    }
}

export const handleUsersSignOut = async () => {
    try {
        return await badhanAxios.delete(USERS_SIGNOUT,{})
    }catch (e:any) {
        return e.response
    }
}
