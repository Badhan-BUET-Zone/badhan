import queue from 'express-queue'
import { RequestHandler} from "express"

const donorInsertionQueue: RequestHandler = queue({ activeLimit: 1, queuedLimit: -1 })

export default {
  donorInsertionQueue
}
