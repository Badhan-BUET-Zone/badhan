import dotenv from '../../dotenv'
import * as tokenCache from '../../cache/tokenCache'

import {IToken, TokenModel} from "../models/Token";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";
import { randomUUID } from 'node:crypto';
import {IUserAgent} from "../../middlewares/userAgent";

export const insertAndSaveTokenWithExpiry = async (donorId: mongoose.Types.ObjectId, userAgent: IUserAgent, expiresIn: string| null): Promise<{data: IToken, message: string, status: string}> => {
    // `jwtid` is not decoration and must not be dropped as noise. The payload is otherwise just
    // the donor id and a constant, and `iat` has one-second resolution — so two tokens minted for
    // the same donor inside the same second used to come out BYTE-IDENTICAL whenever neither
    // carried an expiry. Two rows then held the same token string, findTokenDataByToken matched
    // whichever came first, and deleting one row from the device list revoked nothing: the
    // credential kept working through the other. A unique id per token makes every mint its own
    // credential, which is what the device list has always claimed to show.
    //
    // This was latent while only sign-in minted expiry-less tokens (a human signing in twice in
    // one second is rare). POST /users/redirection now mints them too, and pressing a button
    // twice is not rare at all.
    const options: {expiresIn?: string, jwtid: string} = { jwtid: randomUUID() }
    if (expiresIn) {
        options.expiresIn = expiresIn
    }

    const token: string = jwt.sign({
        _id: String(donorId),
        access: 'auth'
    }, dotenv.JWT_SECRET, options).toString()
    const tokenData: IToken = new TokenModel({donorId, token, ...userAgent})
    const data: IToken = await tokenData.save()

    return {
        message: 'Token insertion successful',
        status: 'OK',
        data
    }

}

export const findTokenDataByToken = async (token: string):Promise<{data?: IToken,message: string, status: string}> => {
    const tokenData: IToken|null = await TokenModel.findOne({token})
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

export const deleteTokenDataByToken = async (token: string):Promise<{message: string, status: string}> => {
    const tokenData: IToken | null = await TokenModel.findOneAndDelete({token})
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

export const deleteAllTokensByDonorId = async (donorId: mongoose.Types.ObjectId): Promise<{message: string, status: string}> => {
    await TokenModel.deleteMany({donorId})
    tokenCache.clearAll()
    return {
        message: 'Token successfully removed',
        status: 'OK',
    }
}

export const findTokenDataExceptSpecifiedToken = async (donorId: mongoose.Types.ObjectId, excludedToken: string): Promise<{status: string, message: string, data: IToken[]}> => {
    const tokenDataList: IToken[] = await TokenModel.find({
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

export const deleteByTokenId = async (tokenId: string): Promise<{message: string, status: string, data?:IToken}> => {
    const deletedToken: IToken | null = await TokenModel.findByIdAndDelete(tokenId)
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
    }
}
