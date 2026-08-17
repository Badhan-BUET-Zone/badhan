import { PipelineStage } from 'mongoose'
import { FeedbackModel, IFeedback, FeedbackType } from '../models/Feedback'
import {
  DESIGNATIONS_INDEX,
  HALLS_INDEX,
  HALL_INDICES_ALLOWED_FOR_DONOR,
  hasNoSpecificHall
} from '../../constants'
import { DonorModel, IDonor } from '../models/Donor'

/**
 * The two `feedbackJSON` shapes.
 *
 * Flexible in the database, strict at the edge: the column is `Schema.Types.Mixed` and
 * the schema enforces nothing about its contents, so these types plus the route's
 * validators are the only description of what a payload may contain.
 *
 * Neither shape carries a `type` key — that is a column on the row.
 */

// type: 'feedback' — an existing donor's message.
export interface IFeedbackPayload {
  phone: number
  studentId: string
  text: string
}

// type: 'newDonor' — a registration submission.
//
// This key list is exactly `keysExpected` in
// badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue,
// minus `key`, which the prefill adds at render time. That is what makes the prefill a
// straight handoff rather than a mapping layer. KEEP THE TWO LISTS IN STEP.
export interface INewDonorPayload {
  name: string
  phone: number
  studentId: string
  bloodGroup: number
  hall: number
  address: string
  roomNumber: string
  comment: string
  donationCount: number
  lastDonation: number | null
  plateletDonationCount: number
  lastPlateletDonation: number | null
  availableToAll: boolean
}

export type FeedbackPayload = IFeedbackPayload | INewDonorPayload

export const insertFeedback = async (
  type: FeedbackType,
  hall: number,
  feedbackJSON: FeedbackPayload
): Promise<{ data: IFeedback, message: string, status: string }> => {
  // Three arguments: the two fields the server owns, and the payload. The submitter's
  // phone and student id are inside `feedbackJSON` and are not lifted onto the row.
  const feedback: IFeedback = new FeedbackModel({ type, hall, feedbackJSON })
  const data: IFeedback = await feedback.save()
  return {
    data,
    message: 'Feedback insertion successful',
    status: 'OK'
  }
}

export const findFeedbackById = async (
  feedbackId: string
): Promise<{ data?: IFeedback, message: string, status: string }> => {
  const data: IFeedback | null = await FeedbackModel.findOne({ _id: feedbackId })
  if (data) {
    return {
      data,
      message: 'Feedback fetched successfully',
      status: 'OK'
    }
  }
  return {
    message: 'Feedback not found',
    status: 'ERROR'
  }
}

export const deleteFeedbackById = async (
  feedbackId: string
): Promise<{ data?: IFeedback, message: string, status: string }> => {
  const data: IFeedback | null = await FeedbackModel.findByIdAndDelete(feedbackId)
  if (data) {
    return {
      data,
      message: 'Feedback removed successfully',
      status: 'OK'
    }
  }
  return {
    message: 'Could not remove feedback',
    status: 'ERROR'
  }
}

// Halls that mean "no specific hall", derived from the helper rather than written out as
// `hall > 6`, so that adding a hall index cannot silently change who sees what.
const UNRESTRICTED_HALLS: number[] = [...HALL_INDICES_ALLOWED_FOR_DONOR, HALLS_INDEX.ATTACHED]
  .filter((hall: number): boolean => hasNoSpecificHall(hall))

/**
 * The matched donor, reduced to what a queue row can do with one.
 *
 * A feedback row is a name, a phone number and a link to the profile — the queue used to
 * render a whole search-result card here, and paid for it with four extra $lookups per row
 * (donations, platelet donations, call records, active donors) whose numbers nothing on the
 * page ever showed. Anything richer than this belongs on the profile the row links to, which
 * fetches it for one donor rather than for every row in the queue.
 *
 * `availableToAll` is not displayed: the visibility $match below reads it. Removing it from
 * this projection silently widens or narrows who sees which row.
 *
 * The $project is an INCLUSION projection on purpose: the search pipeline uses an exclusion
 * list, which leaks any field added to the Donor schema later. Here a new field is invisible
 * until somebody names it — which is why password, email and designation are absent.
 */
const donorSummaryPipeline: any[] = [
  {
    $project: {
      _id: 1,
      name: 1,
      phone: 1,
      availableToAll: 1
    }
  }
]

/**
 * Everything the viewer is allowed to see, oldest first.
 *
 * There is no new permission concept: you see the feedback of the donors you can already
 * find in search. The row's own `hall` column does most of the work, so the filter is a
 * plain match; only the availableToAll clause needs the donor, and the join happens
 * anyway to name the row. The $match therefore runs AFTER the $lookup.
 *
 * A registration row has no matching donor, so it falls through to the hall rule —
 * correct, since somebody who is not in the database cannot be marked available to all.
 */
export const findFeedbacksForUser = async (user: IDonor): Promise<{data: any[], message: string, status: string}> => {
  const isSuperAdmin: boolean = user.designation === DESIGNATIONS_INDEX.SUPER_ADMIN
  const visibility: any = isSuperAdmin
    ? {}
    : {
      $or: [
        { hall: user.hall },
        { hall: { $in: UNRESTRICTED_HALLS } },
        { 'donor.availableToAll': true }
      ]
    }

  const pipeline: PipelineStage[] = [
    { $sort: { date: 1 } },
    {
      // Joined on dotted paths into the Mixed column: there are no phone or studentId
      // columns on a feedback row.
      $lookup: {
        from: 'donors',
        let: { feedbackPhone: '$feedbackJSON.phone', feedbackStudentId: '$feedbackJSON.studentId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$phone', '$$feedbackPhone'] },
                  { $eq: ['$studentId', '$$feedbackStudentId'] }
                ]
              }
            }
          },
          ...donorSummaryPipeline
        ],
        as: 'donorMatches'
      }
    },
    { $addFields: { donor: { $ifNull: [{ $arrayElemAt: ['$donorMatches', 0] }, null] } } },
    ...(isSuperAdmin ? [] : [{ $match: visibility }]),
    { $project: { _id: 1, type: 1, hall: 1, feedbackJSON: 1, date: 1, donor: 1 } }
  ]

  const data: any[] = await FeedbackModel.aggregate(pipeline)
  return {
    data,
    message: 'Feedbacks fetched successfully',
    status: 'OK'
  }
}

/**
 * The same rule as findFeedbacksForUser, for one row. Used by the discard permission
 * check, which cannot reuse the aggregate because it needs to distinguish "gone" from
 * "not yours" — a 404 from a 403.
 */
export const isFeedbackVisibleToUser = async (feedback: IFeedback, user: IDonor): Promise<boolean> => {
  if (user.designation === DESIGNATIONS_INDEX.SUPER_ADMIN) {
    return true
  }
  if (feedback.hall === user.hall || hasNoSpecificHall(feedback.hall)) {
    return true
  }
  const payload: any = feedback.feedbackJSON
  if (payload === null || payload === undefined) {
    return false
  }
  const donor: IDonor | null = await DonorModel.findOne({ phone: payload.phone, studentId: payload.studentId })
  return donor !== null && donor.availableToAll === true
}
