import { bloodGroups, restrictedHallNames } from '@/mixins/constants'

// The thirteen questions, in order.
//
// Declarative on purpose. An earlier shape would have been twelve near-identical .vue files, which
// puts the validation rules twelve places away from each other and makes keeping them in step with
// the server's validators a matter of luck. Here every rule sits in one column of one table.
//
// KEEP THE FIELD LIST IN STEP with validations/feedbackPayload.ts on the backend and with
// NewPersonCard's keysExpected — the payload this builds is handed straight to that component by
// the Feedback page's prefill.
//
// `hall` IS a step, and it is the one step that renders two ways. Under a code made for a named
// hall it is disabled and already answered; under an "All Halls" code the student picks. An
// earlier revision left it out on the rule that a screen which cannot be answered is not a step —
// but with All Halls codes the hall is a real question, and having it appear in one mode and
// vanish in the other would give the two codes visibly different sequences for no reason a student
// could see. So it is always there, and PublicRegistration.vue decides how it renders.

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

// The halls a student may say they are in: the seven residential halls, and nothing else.
//
// It is exactly the set NewPersonCard offers the volunteer on the donor-creation form, and exactly
// HALL_INDICES_ALLOWED_FOR_DONOR_CREATION on the backend. The three must stay in step — a hall a
// student can pick but a volunteer cannot save would be a dead end at creation time.
//
// Narrower than HALL_INDICES_ALLOWED_FOR_DONOR, which still admits (Unknown) for the records that
// already hold it: registering is a creation, and a creation must name a hall. Attached is in none
// of them; HALL_ANY is in none of them either, because it is a property of a code and never of a
// person.
export const HALL_CHOICES: { label: string, value: number }[] =
  restrictedHallNames().map((label: string, value: number) => ({ label, value }))

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
    field: 'hall',
    question: 'Which hall are you in?',
    kind: 'choice',
    choices: HALL_CHOICES,
    valid: (v: unknown): boolean => HALL_CHOICES.some((choice) => choice.value === v)
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
    // The hall clause still earns its place: under a code made for one named hall the student was
    // shown a hall they could not change, and this is where they say it is the wrong one. Under an
    // All Halls code they chose it themselves and the clause simply does not apply to them.
    hint: 'Anything the questions above did not cover — including where you actually live, if the hall above is not yours.',
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
