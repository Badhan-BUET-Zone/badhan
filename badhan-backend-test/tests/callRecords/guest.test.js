const operations = require('../lib/operations');
const { postCallRecordsSchema, deleteCallRecordsSchema } = require('./schemas');

test('POST&DELETE/guest/callrecords: guest', async () => {
  const creation = await operations.guestPost('/guest/callrecords', {}, postCallRecordsSchema);
  await operations.guestDelete(
    `/guest/callrecords?donorId=23455&callRecordId=${creation.data.callRecord._id}`,
    deleteCallRecordsSchema
  );
});
