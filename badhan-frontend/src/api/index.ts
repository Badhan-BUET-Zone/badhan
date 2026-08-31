/* eslint-disable */
// @ts-nocheck


/*
This module handles all necessary tasks to communicate with the backend.
The only backend is an express app.
 */
import axios, {AxiosError, AxiosResponse} from 'axios'

import { store } from '@/store/store'
import { processError } from '@/mixins/helpers'
import { myConsole } from '@/mixins/myConsole'
import { environmentService} from "@/mixins/environment";
import { HTTP_STATUS } from '@/mixins/constants'

const baseURL = environmentService.getAPIBaseURL()

myConsole.log('%cENVIRONMENT: ','color: #ffff00', 'name ' ,environmentService.getEnvironmentName())

const badhanAxios = axios.create({
  baseURL
})

const CancelToken = axios.CancelToken

const enableGuestAPI = () => {
  badhanAxios.defaults.baseURL += '/guest'
}

const resetBaseURL = () => {
  badhanAxios.defaults.baseURL = baseURL
}

const isGuestEnabled = () => {
  return badhanAxios.defaults.baseURL?.includes('/guest')
}

badhanAxios.interceptors.request.use((config) => {
  // Do something before request is sent
  store.commit('setAppBarLoadingFlag')

  myConsole.log('%cAPI:', 'color: #ff00ff',' REQUEST TO ' + config.method + ' ' + config.url + ': ', config.data, config.params)

  // Clearing the current toast is right for a request the USER just triggered: the old message
  // is about the last thing they did, not this one. It is wrong for a background fetch nobody
  // asked for — the member chat fetches on app open and immediately after sign-in, and an
  // unmarked one wipes "Signed in successfully" off the screen before it can be read.
  // A caller opts out by setting `backgroundRequest` on its config.
  if (!(config as any).backgroundRequest) {
    store.dispatch('notification/clearNotification')
  }

  config.headers = {
    'x-auth': store.getters.getToken
  }

  if (window.navigator.onLine) {
    return config
  }

  store.dispatch('notification/notifyError', 'Network Not Available')

  return {
    ...config,
    cancelToken: new CancelToken((cancel) => cancel('Network Unavailable'))
  }
}, function (error) {
  // Do something with request error
  store.commit('unsetAppBarLoadingFlag')
  return Promise.reject(error)
})

badhanAxios.interceptors.response.use((response) => {
  // Do something before request is sent
  store.commit('unsetAppBarLoadingFlag')

  myConsole.log('%cAPI:', 'color: #00ff00',' RESPONSE FROM ' + response.config.method + ' ' + response.config.url + ': ', response)
  return response
}, (error) => {
  // Do something with request error
  store.commit('unsetAppBarLoadingFlag')

  let errorNotification
  if (error.response && error.response.data) {
    store.commit('consoleStore/addConsoleLog', {
      text: error.response,
      time: new Date().getTime()
    })
    errorNotification = processError(error)
  } else if (axios.isCancel(error)) {
    errorNotification = 'Network Unavailable'
  } else {
    errorNotification = 'Unknown Error Occurred'
  }
  myConsole.log('Axios Error:', errorNotification)

  store.dispatch('notification/notifyError', errorNotification)
  return Promise.reject(error)
})

export interface BadhanAxiosResponseDataInterface {
  status: string,
  statusCode: number,
  message: string
}

export interface BadhanAxiosResponseInterface<T extends BadhanAxiosResponseDataInterface> extends AxiosResponse {
  data: T
  status: number
}

export interface BadhanAxiosErrorInterface<T extends BadhanAxiosResponseDataInterface> extends AxiosError {
  response: BadhanAxiosResponseInterface<T>
}

/// //////////////////////ROUTES////////////////////////////////////////////////////
/*
CONVENTIONS TO BE FOLLOWED
* No notifications will be sent from here
* Return response in case of successful api calls and return error.response in case of error cases.
* Method names must match with the corresponding route controller of backend
* Always send an object as payload in these methods
* All API calls must be done from this file
 */

export interface PATCHDonorsDesignationPayloadInterface {
  donorId: string
  designation: number
}

const handlePATCHDonorsDesignation = async (payload: PATCHDonorsDesignationPayloadInterface) => {
  try {
    return await badhanAxios.patch('/donors/designation', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface PATCHUsersPasswordPayloadInterface {
  password: string
}
const handlePATCHUsersPassword = async (payload: PATCHUsersPasswordPayloadInterface) => {
  try {
    return await badhanAxios.patch('/users/password', payload)
  } catch (error) {
    return (error as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface DELETEDonorsPayloadInterface {
  donorId: string
}
const handleDELETEDonors = async (payload: DELETEDonorsPayloadInterface) => {
  try {
    return await badhanAxios.delete('/donors', { params: payload })
  } catch (error) {
    return (error as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface POSTDonorsPasswordPayloadInterface {
  donorId: string
}
const handlePOSTDonorsPasswordRequest = async (payload: POSTDonorsPasswordPayloadInterface) => {
  try {
    return await badhanAxios.post('/donors/password', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface GETDonorsDuplicatePayloadInterface {
  phone: string
}
const handleGETDonorsDuplicate = async (payload: GETDonorsDuplicatePayloadInterface) => {
  try {
    return await badhanAxios.get('/donors/checkDuplicate', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
// Bulk existence check for the CSV uploader (plans/phases.md Phase 3). Batches the
// already-normalized 13-digit `8801…` phones 100 per call, fires the chunks sequentially,
// and merges the `donors` arrays. Each returned element is { phone, donorId }, where
// donorId is the real id when the caller may view the donor, else the 'FORBIDDEN' sentinel.
// Returns an axios-response-shaped object on success ({ status: 200, data: { donors } });
// on any chunk failure it returns that chunk's error response so a single failed chunk
// fails the whole pre-flight, with no retry (Phase 5).
const GET_DONORS_PHONE_CHUNK_SIZE = 100
const handleGETDonorsPhoneList = async (phoneList: string[]) => {
  const donors: Array<{ phone: number, donorId: string }> = []
  for (let i = 0; i < phoneList.length; i += GET_DONORS_PHONE_CHUNK_SIZE) {
    const chunk = phoneList.slice(i, i + GET_DONORS_PHONE_CHUNK_SIZE)
    let response
    try {
      response = await badhanAxios.get('/donors/phone', { params: { phoneList: chunk } })
    } catch (e) {
      return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
    }
    if (!response || response.status !== HTTP_STATUS.OK) {
      return response
    }
    donors.push(...response.data.donors)
  }
  return {
    status: 200,
    data: {
      status: 'OK',
      statusCode: 200,
      message: 'Existing donors fetched successfully',
      donors
    }
  }
}

const handleGETLogs = async () => {
  try {
    return await badhanAxios.get('/log')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

const handleGETLogsDonations = async () => {
  try {
    return await badhanAxios.get(`/log/donations`)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

type DELETESignOutResponseData = BadhanAxiosResponseDataInterface
const handleDELETESignOut = async () => {
  try {
    return await badhanAxios.delete('/users/signout', {}) as BadhanAxiosResponseInterface<DELETESignOutResponseData>
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
type DELETESignOutAllResponseData = BadhanAxiosResponseDataInterface
const handleDELETESignOutAll = async () => {
  try {
    return await badhanAxios.delete('/users/signout/all') as BadhanAxiosResponseInterface<DELETESignOutAllResponseData>
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
const handlePOSTRedirection = async () => {
  try {
    return await badhanAxios.post('/users/redirection')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface PATCHRedirectionAuthenticationPayloadInterface {
  token: string
}
const handlePATCHRedirectedAuthentication = async (payload: PATCHRedirectionAuthenticationPayloadInterface) => {
  try {
    return await badhanAxios.patch('/users/redirection', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
const handleGETDonorsMe = async () => {
  try {
    return await badhanAxios.get('/users/me')
  } catch (e) {
    if (axios.isCancel(e)) {
      return {
        status: 503,
        message: e.message,
        data: null
      }
    }
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface POSTSignInPayloadInterface {
  phone: number,
  password: string
}
const handlePOSTSignIn = async (payload: POSTSignInPayloadInterface) => {
  try {
    return await badhanAxios.post('/users/signin', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface POSTDonorsPayloadInterface {
  name: string,
  fatherName: string,
  motherName: string,
  phone: number,
  bloodGroup: number,
  hall: number,
  studentId: number,
  address: string,
  roomNumber: string,
  comment: string,
  lastDonation: number,
  extraDonationCount: number,
  availableToAll: boolean,
  // new platelet related fields (optional)
  lastPlateletDonation?: number,
  extraPlateletDonationCount?: number
}
const handlePOSTDonors = async (payload: POSTDonorsPayloadInterface) => {
  try {
    return await badhanAxios.post('/donors', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface POSTDonationsPayloadInterface {
  donorId: string
  date: number
}
const handlePOSTDonations = async (payload: POSTDonationsPayloadInterface) => {
  try {
    return await badhanAxios.post('/donations', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface POSTPlateletDonationsPayloadInterface {
  donorId: string
  date: number
}
const handlePOSTPlateletDonations = async (payload: POSTPlateletDonationsPayloadInterface) => {
  try {
    return await badhanAxios.post('/platelet-donations', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface GETDonorsPayloadInterface {
  donorId: string
}
const handleGETDonors = async (payload: GETDonorsPayloadInterface) => {
  try {
    return await badhanAxios.get('/donors', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface GETSearchPayloadInterface {
  name: string
  bloodGroup: number
  batch: string
  hall: number
  isAvailable: boolean
  isNotAvailable: boolean
  address: string
  availableToAll: boolean
  archiveFlag: boolean
}
const handleGETSearchV3 = async (payload: GETSearchPayloadInterface) => {
  try {
    return await badhanAxios.get('/search/v3', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

const handleGETStatistics = async () => {
  try {
    return await badhanAxios.get('/log/statistics')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
const handleDELETELogs = async () => {
  try {
    return await badhanAxios.delete('/log')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface GETDonorsAllPayloadInterface {
  archiveFlag: boolean
}
const handleGETDonorsAll = async (payload: GETDonorsAllPayloadInterface) => {
  try {
    return await badhanAxios.get('/donors/all', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface PATCHDonorsCommentPayloadInterface {
  donorId: string
  comment: string
}
const handlePATCHDonorsComment = async (payload: PATCHDonorsCommentPayloadInterface) => {
  try {
    return await badhanAxios.patch('/donors/comment', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface PATCHDonorsPayloadInterface {
  donorId: string,
  name: string,
  fatherName: string,
  motherName: string,
  phone: number,
  studentId: string,
  email: string,
  bloodGroup: number,
  hall: number,
  roomNumber: string,
  address: string,
  availableToAll: boolean,
  archiveFlag: boolean,
  isCertificateEnabled: boolean
}
const handlePATCHDonors = async (payload: PATCHDonorsPayloadInterface) => {
  try {
    return await badhanAxios.patch('/donors/v2', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface DELETEDonationsPayloadInterface {
  date: number
}
const handleDELETEDonations = async (payload: DELETEDonationsPayloadInterface) => {
  try {
    return await badhanAxios.delete('/donations', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface DELETEPlateletDonationsPayloadInterface {
  donorId: string
  date: number
}
const handleDELETEPlateletDonations = async (payload: DELETEPlateletDonationsPayloadInterface) => {
  try {
    return await badhanAxios.delete('/platelet-donations', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface GETDonationsReportPayloadInterface {
  startDate: number,
  endDate: number
}
const handleGETDonationsReport = async (payload: GETDonationsReportPayloadInterface) => {
  try {
    return await badhanAxios.get('/donations/report', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

export interface GETPlateletDonationsReportPayloadInterface {
  startDate: number,
  endDate: number
}
const handleGETPlateletDonationsReport = async (payload: GETPlateletDonationsReportPayloadInterface) => {
  try {
    return await badhanAxios.get('/platelet-donations/report', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

// Drill-down behind one cell of a donation report table: the cell's time window plus
// its blood group (-1 for the 'Total' column) and hall (-1 for 'All Halls').
export interface GETDonationsReportDonorsPayloadInterface {
  startDate: number,
  endDate: number,
  bloodGroup: number,
  hall: number
}
const handleGETDonationsReportDonors = async (payload: GETDonationsReportDonorsPayloadInterface) => {
  try {
    return await badhanAxios.get('/donations/report/donors', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

const handleGETPlateletDonationsReportDonors = async (payload: GETDonationsReportDonorsPayloadInterface) => {
  try {
    return await badhanAxios.get('/platelet-donations/report/donors', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

export interface GETDonorsNewPayloadInterface {
  startTime: number
  endTime: number
}
const handleGETDonorsNew = async (payload: GETDonorsNewPayloadInterface) => {
  try {
    return await badhanAxios.get('/donors/new', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

// No payload: the endpoint takes no parameters, and lists archived donors alongside live ones
// rather than partitioning on an archiveFlag the way /donors/all does.
const handleGETDonorsCertificateEnabled = async () => {
  try {
    return await badhanAxios.get('/donors/certificateEnabled')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

export interface POSTCallRecordPayloadInterface {
  donorId: string
}
const handlePOSTCallRecord = async (payload: POSTCallRecordPayloadInterface) => {
  try {
    return await badhanAxios.post('/callrecords', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface DELETECalLRecordPayloadInterface {
  donorId: string
  callRecordId: string
}
const handleDELETECallRecord = async (payload: DELETECalLRecordPayloadInterface) => {
  try {
    return await badhanAxios.delete('/callrecords', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface POSTPasswordForgetPayloadInterface {
  phone: number
}

const handleGETDonorsDesignation = async () => {
  try {
    return await badhanAxios.get('/donors/designation')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

// The two calls behind the whole feedback feature, and both run without a session most of the time.
// badhanAxios is still the right instance: its request interceptor simply sends no x-auth header
// when the store has no token, and going through it keeps guest mode working (guest mode rewrites
// the base URL to /guest, where both routes are mirrored).
//
// One route, one optional field. Send no `hall` — as the public donor page and the self-service
// panel do — and the answer does not depend on whether anybody is signed in: the token carries the
// matched donor's own hall, exactly as it always has.
//
// Send a `hall` and the request must be authenticated, and the caller must be allowed to state that
// hall: their own, or, for a super admin, any hall or HALL_ANY for an "All Halls" registration code.
// The QR generator always sends one, even a volunteer's own, because that is the branch the server
// logs.
const handlePOSTFeedbackToken = async (payload: { phone: number, studentId: string, durationMinutes?: number, hall?: number }) => {
  try {
    return await badhanAxios.post('/feedbacks/token', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

const handlePOSTFeedback = async (payload: { token: string, type: string, feedbackJSON: object }) => {
  try {
    return await badhanAxios.post('/feedbacks', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

const handleGETFeedbacks = async () => {
  try {
    return await badhanAxios.get('/feedbacks')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

const handleDELETEFeedback = async (feedbackId: string) => {
  try {
    return await badhanAxios.delete('/feedbacks', { params: { feedbackId } })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

/**
 * The member chat's three calls.
 *
 * Nothing here branches on guest mode. The request interceptor already attaches `x-auth`, and
 * `enableGuestAPI` already rewrites the base URL to `/guest`, so these same three functions
 * drive the demo and the live room alike — which is the whole reason the backend mirrors the
 * routes rather than the frontend hiding the feature.
 */

// One route, three reads, told apart only by which cursor is present:
//   {}                          the newest page          (app open)
//   { after }                   everything strictly newer (Fetch messages / after a send)
//   { before, beforeId }        the page older than one message (scrolling up)
// Axios drops undefined params, so the caller passes the shape it means and nothing else.
const handleGETMessages = async (params: { after?: number, before?: number, beforeId?: string, limit?: number }) => {
  try {
    // Marked as a background request: reading the room is not a user action that should clear
    // whatever notification is on screen. Sending and deleting are, and are not marked.
    return await badhanAxios.get('/messages', { params, backgroundRequest: true } as any)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

// `text` and nothing else. `senderId` and `date` are the server's to decide, and a body that
// states either is refused rather than silently ignored — so do not "helpfully" add them here.
const handlePOSTMessage = async (payload: { text: string }) => {
  try {
    return await badhanAxios.post('/messages', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

// A query parameter, matching every other delete in this file but ActiveDonors.
const handleDELETEMessage = async (messageId: string) => {
  try {
    return await badhanAxios.delete('/messages', { params: { messageId } })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

const handleGETPublicContacts = async () => {
  try {
    return await badhanAxios.get('/publicContacts')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
// The certificate page is opened by whoever scans a printed QR code, so this call usually runs with
// no session at all. badhanAxios is still the right instance: the request interceptor simply sends
// no x-auth header when the store has no token, and going through it keeps guest mode working
// (guest mode rewrites the base URL to /guest, where the route is mirrored with faker data).
// The one route that answers with a PDF instead of JSON — the certificate is rendered on the
// backend, so nothing about the template reaches this bundle — and the one route whose failures are
// ordinary states of the page rather than errors: "no such certificate" and "not enabled yet" are
// what the visitor opened the page to be told. validateStatus keeps both out of the shared error
// interceptor, which would otherwise raise a red toast over a page that is already explaining
// itself, and could not say anything useful anyway: with responseType 'blob' the error body is a
// Blob, so processError() finds no message on it.
const handleGETCertificate = async (donorId: string) => {
  try {
    return await badhanAxios.get(`/certificates/${donorId}`, {
      responseType: 'blob',
      validateStatus: (status: number) => [
        HTTP_STATUS.OK, HTTP_STATUS.FORBIDDEN, HTTP_STATUS.NOT_FOUND
      ].includes(status)
    })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

export interface POSTPublicContactsPayloadInterface {
  donorId: string
  bloodGroup: number
}
const handlePOSTPublicContacts = async (payload: POSTPublicContactsPayloadInterface) => {
  try {
    return await badhanAxios.post('/publicContacts', payload)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface DELETEPublicContactsPayloadInterface {
  donorId: string
}
const handleDELETEPublicContacts = async (payload: DELETEPublicContactsPayloadInterface) => {
  try {
    return await badhanAxios.delete('/publicContacts', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

const handleGETLogins = async () => {
  try {
    return await badhanAxios.get('/users/logins')
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface DELETELoginsPayloadInterface {
  tokenId: string
}
const handleDELETELogins = async (payload: DELETELoginsPayloadInterface) => {
  try {
    return await badhanAxios.delete(`/users/logins/${payload.tokenId}`)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface POSTActiveDonorsPayloadInterface {
  donorId: string
}
const handlePOSTActiveDonors = async (payload: POSTActiveDonorsPayloadInterface) => {
  try {
    return await badhanAxios.post('/activeDonors', { donorId: payload.donorId })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface DELETEActiveDonorsPayloadInterface {
  donorId: string
}
const handleDELETEActiveDonors = async (payload: DELETEActiveDonorsPayloadInterface) => {
  try {
    return await badhanAxios.delete(`/activeDonors/${payload.donorId}`)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
export interface GETActiveDonorsPayloadInterface {
  name: string,
  bloodGroup: number,
  batch: string,
  hall: number,
  isAvailable: boolean,
  isNotAvailable: boolean,
  address: string,
  availableToAll: boolean,
  markedByMe: boolean,
  availableToAllOrHall: boolean
}
const handleGETActiveDonors = async (payload: GETActiveDonorsPayloadInterface) => {
  try {
    return await badhanAxios.get(`/activeDonors?bloodGroup=${payload.bloodGroup}&hall=${payload.hall}&batch=${payload.batch}&name=${payload.name}&address=${payload.address}&isAvailable=${payload.isAvailable}&isNotAvailable=${payload.isNotAvailable}&availableToAll=${payload.availableToAll}&markedByMe=${payload.markedByMe}&availableToAllOrHall=${payload.availableToAllOrHall}`)
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}

export {
  badhanAxios,
  enableGuestAPI,
  resetBaseURL,
  isGuestEnabled,

  /// ////////////////ROUTES////////////
  handlePATCHDonorsDesignation,
  handlePATCHUsersPassword,
  handleDELETEDonors,
  handlePOSTDonorsPasswordRequest,
  handleGETDonorsDuplicate,
  handleGETDonorsPhoneList,
  handleGETLogs,
  handleGETLogsDonations,
  handleDELETESignOut,
  handleDELETESignOutAll,
  handlePOSTRedirection,
  handlePATCHRedirectedAuthentication,
  handleGETDonorsMe,
  handlePOSTSignIn,
  handlePOSTDonors,
  handlePOSTDonations,
  handlePOSTPlateletDonations,
  handleGETDonors,
  handleGETSearchV3,
  handleGETStatistics,
  handleDELETELogs,
  handleGETDonorsAll,
  handlePATCHDonorsComment,
  handlePATCHDonors,
  handleDELETEDonations,
  handleDELETEPlateletDonations,
  handleGETDonationsReport,
  handleGETPlateletDonationsReport,
  handleGETDonationsReportDonors,
  handleGETPlateletDonationsReportDonors,
  handleGETDonorsNew,
  handleGETDonorsCertificateEnabled,
  handlePOSTCallRecord,
  handleDELETECallRecord,
  handleGETDonorsDesignation,
  handleGETPublicContacts,
  handlePOSTFeedbackToken,
  handleGETFeedbacks,
  handleDELETEFeedback,
  handlePOSTFeedback,
  handleGETMessages,
  handlePOSTMessage,
  handleDELETEMessage,
  handleGETCertificate,
  handlePOSTPublicContacts,
  handleDELETEPublicContacts,
  handleGETLogins,
  handleDELETELogins,
  handlePOSTActiveDonors,
  handleDELETEActiveDonors,
  handleGETActiveDonors
}
