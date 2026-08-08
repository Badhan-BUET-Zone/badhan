import { bloodGroups } from '@/mixins/constants'

// The twelve questions, in order.
//
// Declarative on purpose. An earlier shape would have been twelve near-identical .vue files, which
// puts the validation rules twelve places away from each other and makes keeping them in step with
// the server's validators a matter of luck. Here every rule sits in one column of one table.
//
// KEEP THE FIELD LIST IN STEP with validations/feedbackPayload.ts on the backend and with
// NewPersonCard's keysExpected — the payload this builds is handed straight to that component by
// the Feedback page's prefill.
//
// `hall` is deliberately absent: it is fixed by the token, and a screen that cannot be answered is
// not a step.

export interface RegistrationStep {
  field: string
  question: string
  hint?: string
  kind: 'text' | 'number' | 'date' | 'choice'
  optional?: boolean
  maxlength?: number
  inputType?: string
  choices?: { label: string, value: number | boolean }[]
  // Present only on the two date steps: the count whose being zero removes this question entirely.
  conditionalOn?: string
  valid: (value: unknown) => boolean
}

const isSevenDigitStudentId = (value: unknown): boolean => {
  const text = String(value ?? '')
  if (!/^\d{7}$/.test(text)) return false
  // The same department and batch checks validateBODYStudentId applies, so a student is told here
  // rather than after twelve questions.
  const batchYear = Number('20' + text.substr(0, 2))
  return batchYear >= 2001 && batchYear <= new Date().getFullYear()
}

const isCount = (value: unknown): boolean => {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n < 99
}

const isPastDate = (value: unknown): boolean => {
  if (!value) return false
  const time = new Date(String(value)).getTime()
  return !Number.isNaN(time) && time <= Date.now()
}

export const REGISTRATION_STEPS: RegistrationStep[] = [
  {
    field: 'name',
    question: 'What is your name?',
    kind: 'text',
    maxlength: 100,
    valid: (v: unknown): boolean => String(v ?? '').trim().length >= 3
  },
  {
    field: 'studentId',
    question: 'What is your student ID?',
    hint: '7 digits',
    kind: 'text',
    maxlength: 7,
    valid: isSevenDigitStudentId
  },
  {
    field: 'phone',
    question: 'What is your phone number?',
    hint: '11 digits, starting with 01',
    kind: 'text',
    inputType: 'tel',
    maxlength: 11,
    valid: (v: unknown): boolean => /^01\d{9}$/.test(String(v ?? ''))
  },
  {
    field: 'bloodGroup',
    question: 'What is your blood group?',
    kind: 'choice',
    choices: bloodGroups.map((label: string, value: number) => ({ label, value })),
    valid: (v: unknown): boolean => Number.isInteger(v)
  },
  {
    field: 'donationCount',
    question: 'How many times have you donated blood?',
    hint: 'Skip if you never have.',
    kind: 'number',
    optional: true,
    maxlength: 2,
    valid: isCount
  },
  {
    field: 'lastDonation',
    question: 'When did you last donate blood?',
    kind: 'date',
    conditionalOn: 'donationCount',
    valid: isPastDate
  },
  {
    field: 'plateletDonationCount',
    question: 'How many times have you donated platelets?',
    hint: 'Skip if you never have.',
    kind: 'number',
    optional: true,
    maxlength: 2,
    valid: isCount
  },
  {
    field: 'lastPlateletDonation',
    question: 'When did you last donate platelets?',
    kind: 'date',
    conditionalOn: 'plateletDonationCount',
    valid: isPastDate
  },
  {
    field: 'roomNumber',
    question: 'What is your room number?',
    kind: 'text',
    optional: true,
    maxlength: 500,
    valid: (v: unknown): boolean => String(v ?? '').trim().length >= 2
  },
  {
    field: 'address',
    question: 'What is your address?',
    kind: 'text',
    optional: true,
    maxlength: 500,
    valid: (v: unknown): boolean => String(v ?? '').trim().length >= 2
  },
  {
    field: 'availableToAll',
    question: 'May donors from other halls contact you?',
    hint: 'If yes, volunteers from any hall can see you when they are looking for your blood group.',
    kind: 'choice',
    choices: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
    valid: (v: unknown): boolean => typeof v === 'boolean'
  },
  {
    field: 'comment',
    question: 'Anything else we should know?',
    hint: 'Anything the questions above did not cover — including which hall you actually live in.',
    kind: 'text',
    optional: true,
    maxlength: 500,
    valid: (v: unknown): boolean => String(v ?? '').trim().length >= 2
  }
]

// What a skipped step sends. Every key is always present in the payload — the backend rejects
// unknown AND missing keys, and a payload that matches keysExpected exactly is what makes the
// Feedback page's prefill a straight handoff.
export const SKIP_DEFAULTS: { [field: string]: number | string } = {
  donationCount: 0,
  plateletDonationCount: 0,
  roomNumber: '',
  address: '',
  comment: ''
}
