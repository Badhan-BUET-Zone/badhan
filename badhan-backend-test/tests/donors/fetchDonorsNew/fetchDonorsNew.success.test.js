const { donorsNewSchema } = require('../schemas');
const { newDonorInfo } = require('../infos');
const operations = require('../../lib/operations');

test('GET /donors/new', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const startTime = Date.now();
    const donorInfoCopy = { ...newDonorInfo, phone: 8801711332312 };
    const created = await operations.createDonor(donorInfoCopy, signInResponse);
    const donorId = created.data.newDonor._id;
    const endTime = Date.now();
    const res = await operations.getNewDonors({ startTime, endTime, signInResponse, schema: donorsNewSchema });
    const matchingDonors = res.data.donors.filter(d => d._id === donorId);
    expect(matchingDonors.length).toBe(1);
    expect(typeof matchingDonors[0].created).toBe('number');
    expect(matchingDonors[0].created).toBeGreaterThanOrEqual(startTime - 1000);
    expect(matchingDonors[0].created).toBeLessThanOrEqual(endTime + 1000);
    await operations.authedDelete(`/donors/${donorId}`, signInResponse); // if this endpoint exists else ignore
    await operations.signOut(signInResponse);
});
