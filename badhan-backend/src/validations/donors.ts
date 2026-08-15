import { validateQUERYStartTime, validateQUERYEndTime } from './validateRequest/validateQuery'
import { validate } from './index'
import { validateBODYEmail, validateBODYArchiveFlag, validateBODYDesignation, validateBODYPassword, validateBODYDonorId, validateBODYAddress, validateBODYRoomNumber, validateBODYAvailableToAll, validateBODYDonationCount, validateBODYComment, validateBODYName, validateBODYFatherName, validateBODYMotherName, validateBODYIsCertificateEnabled, validateBODYPhone, validateBODYBloodGroup, validateBODYHall, validateBODYHallForCreation, validateBODYStudentId, validateBODYExtraPlateletDonationCount, validateBODYLastPlateletDonation, validateBODYLastDonation } from './validateRequest/validateBody'
import { validateQUERYPhoneList, validateQUERYDonorId, validateQUERYPhone, validateQEURYIsNotAvailable, validateQUERYAddress, validateQUERYArchiveFlag, validateQUERYAvailableToAll, validateQUERYBatch, validateQUERYBloodGroup, validateQUERYHall, validateQUERYIsAvailable, validateQUERYName } from './validateRequest/validateQuery'
import {NextFunction, Request, Response} from "express";

const validatePOSTDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYPhone,
  validateBODYBloodGroup,
  // creation, not edit: (Unknown) is rejected here but still accepted by validatePATCHDonors
  validateBODYHallForCreation,
  validateBODYName,
  validateBODYFatherName,
  validateBODYMotherName,
  validateBODYStudentId,
  validateBODYComment,
  validateBODYDonationCount,
  validateBODYAvailableToAll,
  validateBODYAddress,
  validateBODYRoomNumber,
  // optional platelet fields
  validateBODYExtraPlateletDonationCount,
  validateBODYLastPlateletDonation,
  validateBODYLastDonation
])

const validatePATCHDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYName,
  validateBODYFatherName,
  validateBODYMotherName,
  validateBODYPhone,
  validateBODYStudentId,
  validateBODYBloodGroup,
  validateBODYHall,
  validateBODYRoomNumber,
  validateBODYAddress,
  validateBODYAvailableToAll,
  validateBODYArchiveFlag,
  validateBODYIsCertificateEnabled,
  validateBODYEmail
])

const validatePATCHDonorsPassword:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYPassword
])

const validatePATCHDonorsComment:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYComment
])

const validatePATCHDonorsDesignation:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYDesignation
])

const validateGETDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYDonorId
])

const validatePOSTDonorsPasswordRequest:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId
])

const validateGETSearchDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYBloodGroup,
  validateQUERYHall,
  validateQUERYBatch,
  validateQUERYName,
  validateQUERYAddress,
  validateQUERYIsAvailable,
  validateQEURYIsNotAvailable,
  validateQUERYAvailableToAll,
  validateQUERYArchiveFlag
])

const validateDELETEDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYDonorId
])

const validateGETDonorsDuplicate:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYPhone
])

const validateGETDonorsDuplicateMany:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYPhoneList
  // validateQUERYPhoneListElement
])

const validateGETDonorsNew:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYStartTime,
  validateQUERYEndTime
])

// the same chain the search route uses, reused verbatim: same wire name, same
// .toBoolean(), same 400s
const validateGETDonorsAll:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYArchiveFlag
])

export default {
  validatePOSTDonors,
  validatePATCHDonors,
  validatePATCHDonorsComment,
  validatePATCHDonorsPassword,
  validatePATCHDonorsDesignation,
  validateGETDonors,
  validateGETSearchDonors,
  validateDELETEDonors,
  validateGETDonorsDuplicate,
  validatePOSTDonorsPasswordRequest,
  validateGETDonorsDuplicateMany,
  validateGETDonorsNew,
  validateGETDonorsAll
}
