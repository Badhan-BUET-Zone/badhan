import {Request, Response} from 'express'
import * as callRecordInterface from '../db/interfaces/callRecordInterface'
import * as logInterface from '../db/interfaces/logInterface'
import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import NotFoundError404 from "../response/models/errorTypes/NotFoundError404";
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import CreatedResponse201 from "../response/models/successTypes/CreatedResponse201";

const handlePOSTCallRecord = async (req: Request, res: Response): Promise<Response> => {
  const donor = res.locals.middlewareResponse.targetDonor
  const user = res.locals.middlewareResponse.donor
  const callRecordInsertionResult = await callRecordInterface.insertOne(user._id, donor._id)

  await logInterface.addLog(user._id, 'POST CALLRECORDS', { callee: donor.name })

  return res.status(201).send(new CreatedResponse201('Call record insertion successful', {
    callRecord: callRecordInsertionResult.data
  }))
}

const handleDELETECallRecord = async (req: Request<{},{},{},{callRecordId: string}>, res: Response): Promise<Response> => {
  const user = res.locals.middlewareResponse.donor
  const donor = res.locals.middlewareResponse.targetDonor
  const callRecordSearchResult = await callRecordInterface.findById(req.query.callRecordId)
  if (callRecordSearchResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Call record not found',{}))
  }

  const callRecordDeleteResult = await callRecordInterface.deleteById(req.query.callRecordId)
  if (callRecordDeleteResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(callRecordDeleteResult.message,{},{}))
  }

  await logInterface.addLog(user._id, 'DELETE CALLRECORDS', {
    callee: donor.name,
    ...callRecordDeleteResult.data
  })

  return res.status(200).send(new OKResponse200('Call record deletion successful', {
    deletedCallRecord: callRecordDeleteResult.data
  }))
}

export default {
  handlePOSTCallRecord,
  handleDELETECallRecord
}
