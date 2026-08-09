import {
  answerChoice,
  answerText,
  confirmLockedHall,
  createDonorViaApi,
  mintTokenViaApi,
  mintTokenForHallViaApi,
  visitRegistrationPage,
  FeedbackDonor,
  HALL_ANY,
  HALL_TITUMIR,
} from '@support/helpers/feedback';

// Every question in the sequence gets its own documentation screenshot, and only one capture may
// live in a spec file (headless Electron blanks the second). So each spec walks the sequence to the
// step it wants and shoots that one — this module is the walk they share.
//
// The counts are answered NON-ZERO on purpose. A zero removes the matching "when did you last
// donate" step, and the point of these captures is to show all thirteen questions, so the two
// conditional ones have to be in the sequence. It also keeps the progress counter consistent from
// shot to shot: every capture after the counts reads "of 13".
//
// The walk uses a code made for ONE named hall, which is the ordinary case: the hall step then
// renders as a disabled field showing that hall. Pass `{ allHalls: true }` to walk an "All Halls"
// code instead, where the same step is a real question.

const STUDENT = {
  name: 'Sadia Afrin',
  studentId: '1905107',
  localPhone: '01799900014',
  bloodGroup: 2, // B+
  donationCount: '3',
  plateletDonationCount: '2',
  roomNumber: '404',
  address: 'Palashi',
  availableToAll: false,
  comment: 'I am new here.',
};

// The date steps use a picker rather than a text field: open it, take a day that is not disabled,
// confirm, then advance.
const answerDate = (field: string): void => {
  cy.get(`[data-cy="registrationStep-${field}"]`).should('exist');
  cy.get(`[data-cy="registrationInput-${field}"]`).click();
  cy.get(`[data-cy="registrationPicker-${field}"]`).find('button').not('[disabled]').eq(3).click();
  cy.get(`[data-cy="registrationDateOk-${field}"]`).click();
  cy.get('[data-cy="registrationNextButton"]').click();
};

// Answers every step BEFORE `stopBefore` and leaves the page sitting on it. Pass 'review' to walk
// the whole sequence and land on the review screen.
const ANSWER_STEP: { [field: string]: (allHalls: boolean) => void } = {
  name: () => answerText('name', STUDENT.name),
  studentId: () => answerText('studentId', STUDENT.studentId),
  phone: () => answerText('phone', STUDENT.localPhone),
  bloodGroup: () => answerChoice('bloodGroup', STUDENT.bloodGroup),
  // The one step that renders two ways: a disabled field under an ordinary code, a real question
  // under an All Halls one.
  hall: (allHalls: boolean) =>
    allHalls ? answerChoice('hall', HALL_TITUMIR) : confirmLockedHall('Suhrawardy Hall'),
  donationCount: () => answerText('donationCount', STUDENT.donationCount),
  lastDonation: () => answerDate('lastDonation'),
  plateletDonationCount: () => answerText('plateletDonationCount', STUDENT.plateletDonationCount),
  lastPlateletDonation: () => answerDate('lastPlateletDonation'),
  roomNumber: () => answerText('roomNumber', STUDENT.roomNumber),
  address: () => answerText('address', STUDENT.address),
  availableToAll: () => answerChoice('availableToAll', STUDENT.availableToAll),
  comment: () => answerText('comment', STUDENT.comment),
};

export const STEP_ORDER = Object.keys(ANSWER_STEP);

// `minterStudentId` only has to be unique across the specs in this folder — it belongs to the donor
// whose credentials mint the token, not to the student being registered.
export const walkTo = (
  stopBefore: string,
  minterStudentId: string,
  options: { allHalls?: boolean } = {},
): void => {
  const allHalls = options.allHalls === true;
  createDonorViaApi({ name: 'Token Minter', studentId: minterStudentId }, 'minter');

  cy.get<FeedbackDonor>('@minter').then((minter) => {
    const token = allHalls
      ? mintTokenForHallViaApi(minter.phone, minter.studentId, HALL_ANY)
      : mintTokenViaApi(minter.phone, minter.studentId);

    token.then((t) => {
      visitRegistrationPage(t);

      for (const field of STEP_ORDER) {
        if (field === stopBefore) return;
        ANSWER_STEP[field](allHalls);
      }
    });
  });
};
