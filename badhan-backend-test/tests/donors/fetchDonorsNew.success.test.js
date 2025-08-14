const { badhanAxios } = require('../../api');
const validate = require('jsonschema').validate;
const { postDonorSchema, donorsNewSchema } = require('./schemas');
const env = require("../../config");
const { newDonorInfo } = require("./infos");

test('GET /donors/new', async () => {
    let signInResponse = await badhanAxios.post("/users/signin", {
        phone: env.SUPERADMIN_PHONE,
        password: env.SUPERADMIN_PASSWORD,
    });

    // Save start time before donor creation
    const startTime = Date.now();

    // Create donor
    const postRes = await badhanAxios.post('/donors', newDonorInfo, {
        headers: { 'x-auth': signInResponse.data.token },
    });
    expect(postRes.status).toBe(201);
    expect(validate(postRes.data, postDonorSchema).valid).toBe(true);
    const donorId = postRes.data.newDonor._id;

    // Save end time after donor creation
    const endTime = Date.now();

    // Fetch donors created in the time range
    const res = await badhanAxios.get('/donors/new', {
        headers: { 'x-auth': signInResponse.data.token },
        params: { startTime, endTime }
    });
    expect(res.status).toBe(200);
    const validationResult = validate(res.data, donorsNewSchema);
    expect(validationResult.errors).toStrictEqual([]);
    // Check that only one donor matches the created donor
    const matchingDonors = res.data.donors.filter(d => d._id === donorId);
    expect(matchingDonors.length).toBe(1);
    // Verify 'created' exists and is within the time range for the created donor
    expect(typeof matchingDonors[0].created).toBe('number');
    expect(matchingDonors[0].created).toBeGreaterThanOrEqual(startTime-1000);// small tolerance
    expect(matchingDonors[0].created).toBeLessThanOrEqual(endTime + 1000); // small tolerance
});
