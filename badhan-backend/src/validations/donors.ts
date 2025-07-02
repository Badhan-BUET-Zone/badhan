import { validate } from './index'
import { validateBODYEmail, validateBODYPromoteFlag, validateBODYPassword, validateBODYDonorId, validateBODYAddress, validateBODYRoomNumber, validateBODYAvailableToAll, validateBODYDonationCount, validateBODYComment, validateBODYName, validateBODYPhone, validateBODYBloodGroup, validateBODYHall, validateBODYStudentId } from './validateRequest/validateBody'
import { validateQUERYPhoneList, validateQUERYDonorId, validateQUERYPhone, validateQEURYIsNotAvailable, validateQUERYAddress, validateQUERYAvailableToAll, validateQUERYBatch, validateQUERYBloodGroup, validateQUERYHall, validateQUERYIsAvailable, validateQUERYName } from './validateRequest/validateQuery'
import {NextFunction, Request, Response} from "express";

const validatePOSTDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYPhone,
  validateBODYBloodGroup,
  validateBODYHall,
  validateBODYName,
  validateBODYStudentId,
  validateBODYComment,
  validateBODYDonationCount,
  validateBODYAvailableToAll,
  validateBODYAddress,
  validateBODYRoomNumber
])

const validatePATCHDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYName,
  validateBODYPhone,
  validateBODYStudentId,
  validateBODYBloodGroup,
  validateBODYHall,
  validateBODYRoomNumber,
  validateBODYAddress,
  validateBODYAvailableToAll,
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
  validateBODYPromoteFlag
])

const validatePATCHAdmins:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId
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
  validateQUERYAvailableToAll
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

const validatePATCHAdminsSuperAdmin:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYPromoteFlag
])

export default {
  validatePOSTDonors,
  validatePATCHDonors,
  validatePATCHDonorsComment,
  validatePATCHDonorsPassword,
  validatePATCHDonorsDesignation,
  validatePATCHAdmins,
  validateGETDonors,
  validateGETSearchDonors,
  validateDELETEDonors,
  validateGETDonorsDuplicate,
  validatePOSTDonorsPasswordRequest,
  validateGETDonorsDuplicateMany,
  validatePATCHAdminsSuperAdmin
}
