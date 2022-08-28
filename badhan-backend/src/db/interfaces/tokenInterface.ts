// @ts-nocheck
// tslint:disable
import dotenv from '../../dotenv'
import * as tokenCache from '../../cache/tokenCache'

import {TokenModel} from "../models/Token";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";
import {IUserAgent} from "../../middlewares/userAgent";

export const insertAndSaveTokenWithExpiry = async (donorId: mongoose.Types.ObjectId, userAgent: IUserAgent, expiresIn: string| null) => {
    let options = {}
    if (expiresIn) {
        options = {expiresIn}
    }

    const token = jwt.sign({
        _id: String(donorId),
        access: 'auth'
    }, dotenv.JWT_SECRET, options).toString()
    const tokenData = new TokenModel({donorId, token, ...userAgent})
    const data = await tokenData.save()

    return {
        message: 'Token insertion successful',
        status: 'OK',
        data
    }

}

export const findTokenDataByToken = async (token: string) => {
    const tokenData = await TokenModel.findOne({token})
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

export const deleteTokenDataByToken = async (token: string) => {
    const tokenData = await TokenModel.findOneAndDelete({token})
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

export const deleteAllTokensByDonorId = async (donorId: mongoose.Types.ObjectId) => {
    const tokenData = await TokenModel.deleteMany({donorId})
    tokenCache.clearAll()
    return {
        message: 'Token successfully removed',
        status: 'OK',
        data: tokenData
    }
}

export const findTokenDataExceptSpecifiedToken = async (donorId: mongoose.Types.ObjectId, excludedToken: string) => {
    const tokenDataList = await TokenModel.find({
        $and: [{
            donorId: {
                $eq: donorId
            },
            token: {
                $ne: excludedToken
            }
        }]
    }, {_id: 1, browserFamily: 1, device: 1, ipAddress: 1, os: 1})
    return {
        message: 'Recent logins fetched successfully',
        status: 'OK',
        data: tokenDataList
    }
}

export const deleteByTokenId = async (tokenId: string) => {
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
