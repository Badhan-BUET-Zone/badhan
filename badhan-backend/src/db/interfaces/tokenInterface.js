const { Token } = require('../models/Token')
const jwt = require('jsonwebtoken')

const insertAndSaveToken = async (donorId, userAgent) => {
  const access = 'auth'
  const token = await jwt.sign({
    _id: String(donorId),
    access
  }, process.env.JWT_SECRET).toString()
  const tokenData = new Token({ donorId, token, ...userAgent })
  const data = await tokenData.save()
  if (data.nInserted === 0) {
    return {
      message: 'Token insertion failed',
      status: 'ERROR',
      data: data
    }
  }
  return {
    message: 'Token insertion successful',
    status: 'OK',
    data: data
  }
}

const addToken = async (donorId, token, userAgent) => {
  const tokenData = new Token({ donorId, token, ...userAgent })
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

const findTokenDataByTokenCached = async (token, donorId) => {
  const tokenData = await Token.findOne({ token })
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

const findTokenDataByToken = async (token) => {
  const tokenData = await Token.findOne({ token })
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

const deleteTokenDataByToken = async (token, donorId) => {
  const tokenData = await Token.findOneAndDelete({ token })
  if (tokenData) {
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

const deleteAllTokensByDonorId = async (donorId) => {
  const tokenData = await Token.deleteMany({ donorId })
  return {
    message: 'Token successfully removed',
    status: 'OK',
    data: tokenData
  }
}

const findTokenDataExceptSpecifiedToken = async (donorId, excludedToken) => {
  const tokenDataList = await Token.find({
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

const deleteByTokenId = async (tokenId, donorId) => {
  const deletedToken = await Token.findByIdAndDelete(tokenId)
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

module.exports = {
  addToken,
  findTokenDataByTokenCached,
  findTokenDataByToken,
  deleteTokenDataByToken,
  deleteAllTokensByDonorId,
  insertAndSaveToken,
  findTokenDataExceptSpecifiedToken,
  deleteByTokenId
}
