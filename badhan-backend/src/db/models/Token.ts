import {model, Model, Schema, Document} from 'mongoose'

export interface JwtPayload {
  _id: string
}

export interface IToken extends Document {
  donorId: Schema.Types.ObjectId,
  token: string,
  expireAt?: number,
  os: string,
  browserFamily: string,
  device: string,
  ipAddress: string,
}
const tokenSchema: Schema = new Schema<IToken>({
  donorId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  token: {
    type: String,
    required: true
  },
  expireAt: {
    type: Date,
    default: (): number => {
      return new Date().getTime() + 60 * 1000 * 60 * 24 * 30// 30days
    },
    select: false
  },
  os: {
    type: String,
    required: true
  },
  browserFamily: {
    type: String,
    required: true
  },
  device: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  }
}, { versionKey: false, id: false })

tokenSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

export const TokenModel: Model<IToken> = model<IToken>('Tokens', tokenSchema)
