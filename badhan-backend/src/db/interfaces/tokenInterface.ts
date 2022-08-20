// @ts-nocheck
/* tslint:disable */
import dotenv from '../../dotenv'
const tokenCache = require('../../cache/tokenCache')
// const { Token } = require('../models/Token')
import {TokenModel} from "../models/Token";
const jwt = require('jsonwebtoken')
export const insertAndSaveTokenWithExpiry = async (donorId, userAgent, expiresIn) => {
  let options = {}
  if (expiresIn) {
    options = { expiresIn }
  }
  const token = await jwt.sign({
    _id: String(donorId),
    access: 'auth'
  }, dotenv.JWT_SECRET, options).toString()
  const tokenData = new TokenModel({ donorId, token, ...userAgent })
  const data = await tokenData.save()
  if (data.nInserted === 0) {
    return {
      message: 'Token insertion failed',
      status: 'ERROR',
      data: data
    }
  } else {
    return {
      message: 'Token insertion successful',
      status: 'OK',
      data: data
    }
  }
}

export const findTokenDataByToken = async (token) => {
  const tokenData = await TokenModel.findOne({ token })
  if (!tokenData) {
    return {
      message: 'Token not found',
      status: 'ERROR'
    }
  }
  return {
    message: 'Token found successfully',
    status: 'OK',
    data: tokenData
  }
}

export const deleteTokenDataByToken = async (token) => {
  const tokenData = await TokenModel.findOneAndDelete({ token })
  if (tokenData) {
    tokenCache.clear(token)
    return {
      message: 'Token successfully removed',
      status: 'OK'
    }
  }
  return {
    message: 'Token not found',
    status: 'ERROR'
  }
}

export const deleteAllTokensByDonorId = async (donorId) => {
  const tokenData = await TokenModel.deleteMany({ donorId })
  tokenCache.clearAll()
  return {
    message: 'Token successfully removed',
    status: 'OK',
    data: tokenData
  }
}

export const findTokenDataExceptSpecifiedToken = async (donorId, excludedToken) => {
  const tokenDataList = await TokenModel.find({
    $and: [{
      donorId: {
        $eq: donorId
      },
      token: {
        $ne: excludedToken
      }
    }]
  }, { _id: 1, browserFamily: 1, device: 1, ipAddress: 1, os: 1 })
  return {
    message: 'Recent logins fetched successfully',
    status: 'OK',
    data: tokenDataList
  }
}

export const deleteByTokenId = async (tokenId) => {
  const deletedToken = await TokenModel.findByIdAndDelete(tokenId)
  tokenCache.clearAll()
  if (deletedToken) {
    return {
      message: 'Token successfully removed',
      status: 'OK',
      data: deletedToken
    }
  }
  return {
    message: 'Token not found',
    status: 'ERROR',
    data: null
  }
}
