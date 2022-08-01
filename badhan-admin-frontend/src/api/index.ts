import axios, {AxiosRequestConfig, AxiosResponse} from 'axios'
import {USERS_ME, USERS_SIGNIN, USERS_SIGNOUT} from "./model";
import {store} from "../store";
import { ContributorType} from "../ui-component/contributors/contributorModel";

const badhanAxios = axios.create({baseURL: 'https://badhan-buet.uc.r.appspot.com/'})
const badhanAdminAxios = axios.create({baseURL: process.env.REACT_APP_ADMIN_API_URL})
const firebaseAxios = axios.create({baseURL: 'https://badhan-buet-default-rtdb.firebaseio.com'})
const backupAPIAxios = axios.create({baseURL: 'http://localhost:4000'})

const requestInterceptorOnFullfilled = (config: AxiosRequestConfig)=>{
    console.log('%cREQUEST TO ' + config.method + ' ' + config.url + ': ', 'color: #ff00ff', config.data, config.params)
    const token = store.getState().userProfile.token
    if(token){
        config.headers = {
            ...config.headers,
            'x-auth': token
        }
    }

    return config
}

const responseInterceptorOnFulFilled = (response: AxiosResponse) => {
    console.log('%cRESPONSE FROM ' + response.config.url + ': ', 'color: #00ff00', response)
    return response
}

const requestResponseInterceptorOnRejected = (error: any)=>{
    // Do something with request error
    return Promise.reject(error)
}

badhanAxios.interceptors.request.use(requestInterceptorOnFullfilled,  requestResponseInterceptorOnRejected)
badhanAxios.interceptors.response.use(responseInterceptorOnFulFilled, requestResponseInterceptorOnRejected)

firebaseAxios.interceptors.request.use(requestInterceptorOnFullfilled, requestResponseInterceptorOnRejected)
firebaseAxios.interceptors.response.use(responseInterceptorOnFulFilled, requestResponseInterceptorOnRejected)

backupAPIAxios.interceptors.request.use(requestInterceptorOnFullfilled, requestResponseInterceptorOnRejected)
backupAPIAxios.interceptors.response.use(responseInterceptorOnFulFilled, requestResponseInterceptorOnRejected)

badhanAdminAxios.interceptors.request.use(requestInterceptorOnFullfilled, requestResponseInterceptorOnRejected)
badhanAdminAxios.interceptors.response.use(responseInterceptorOnFulFilled, requestResponseInterceptorOnRejected)


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

export const handleGETBackup = async () => {
    try {
        return await backupAPIAxios.get('/backup')
    }catch (e:any) {
        return e.response
    }
}

export const handlePOSTBackup = async () => {
    try{
        return await backupAPIAxios.post('/backup')
    }catch (e:any) {
        return e.response
    }
}

export const handleDELETEBackupOld = async () => {
    try {
        return await backupAPIAxios.delete('/backup/old')
    }catch (e:any) {
        return e.response
    }
}

export const handlePOSTRestore = async (payload: {date: number}) => {
    try {
        return await backupAPIAxios.post(`/restore/${payload.date}`)
    }catch (e:any) {
        return e.response
    }
}

export const handlePOSTRestoreToProduction = async (payload:{date: number}) => {
    try {
        return await backupAPIAxios.post(`/restore/${payload.date}?production=true`)
    }catch (e:any) {
        return e.response
    }
}

export const handleDELETEBackup = async (payload: { date: number }) =>{
    try{
        return await backupAPIAxios.delete(`/backup/date/${payload.date}`)
    }catch (e:any) {
        return e.response
    }
}

export const handlePOSTContributor = async (payload: {
    type: ContributorType,
    name: string,
    calender: string,
    contribution: string[],
    links: {color: string, link: string, icon: string}[]
}) =>{
    try{
        return await badhanAdminAxios.post('/contributors',payload)
    }catch (e: any) {
        return e.response
    }
}

export const handleGETContributor = async () => {
    try{
        return await badhanAdminAxios.get('/contributors')
    }catch (e:any) {
        return e.response
    }
}

export const handleDELETEContributor = async (payload:{id: string}) => {
    try {
        return await badhanAdminAxios.delete(`/contributors/${payload.id}`)
    }catch (e:any) {
        return e.response
    }
}

export const handlePOSTContributorImage = async (payload: {id: string, formData: FormData})=>{
    try {
        return await badhanAdminAxios.post(`/contributors/${payload.id}/image`,payload.formData,{
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
    }catch (e:any) {
        return e.response
    }
}

export const handlePATCHContributor = async (payload: {
    id: string,
    type: ContributorType,
    name: string,
    calender: string,
    contribution: string[], links: {link: string, color: string, icon: string}[]})=>{
    try {
        return await badhanAdminAxios.patch(`/contributors/${payload.id}`,payload)
    }catch (e:any) {
        return e.response
    }
}
