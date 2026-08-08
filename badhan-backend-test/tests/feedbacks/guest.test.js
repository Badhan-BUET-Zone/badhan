const operations = require('../lib/operations');
const { postFeedbackTokenSchema, postFeedbackSchema, getFeedbacksSchema } = require('./schemas');

// Guest mode prefixes every call with /guest and answers from faker. Without these mirrors a guest
// demo would hit the real routes and either fail or, worse, write demo rows into a real queue.

test('POST/guest/feedbacks/token: guest', async () => {
  const response = await operations.guestPost(
    '/guest/feedbacks/token',
    { phone: 8801500000000, studentId: '1605011' },
    postFeedbackTokenSchema
  );
  // A real, mintable token: guest mode exercises the same code path rather than a stub, so the
  // guest QR generator and the guest donor page behave like the real thing.
  expect(response.data.token.split('.').length).toBe(3);
});

test('POST/guest/feedbacks: guest', async () => {
  await operations.guestPost(
    '/guest/feedbacks',
    { token: 'anything', type: 'feedback', feedbackJSON: {} },
    postFeedbackSchema
  );
});

test('GET&DELETE/guest/feedbacks: guest', async () => {
  const list = await operations.guestGet('/guest/feedbacks', getFeedbacksSchema);
  // One row of each kind, so the Feedback page can be demoed without filing a real submission —
  // and it is the only way to show the new-donor card at all.
  expect(list.data.feedbacks.map((f) => f.type).sort()).toEqual(['feedback', 'newDonor']);
  expect(list.data.feedbacks.find((f) => f.type === 'newDonor').donor).toBeNull();

  await operations.guestDelete('/guest/feedbacks?feedbackId=blahblah');
});
