import { Connection, Model } from 'mongoose'
import { mongoose } from '../mongoose'
import { DonorModel, IDonor } from '../models/Donor'

/**
 * The Donor model bound to `connection`.
 *
 * Every model in this project is compiled on the default connection, which is the one the
 * process is configured for by MONGODB_URI. A reset aimed at another environment's database
 * (see the development reset in `internalRoutes`) opens its own connection, and a model
 * carries the connection it was compiled on — so saving through `DonorModel` there would
 * quietly write to the local database instead of the one that was asked for. Recompiling the
 * same schema on the target connection is what makes the target actually take effect.
 *
 * The default connection keeps its own compiled model: recompiling on it throws
 * OverwriteModelError.
 */
export const donorModelOn = (connection: Connection): Model<IDonor> => {
  if (connection === mongoose.connection) return DonorModel
  return (connection.models.Donor as Model<IDonor>) || connection.model<IDonor>('Donor', DonorModel.schema)
}
