const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { getPlateletDonationReportsSchema } = require("./schemas");

// success
test("GET/platelet-donations/report: success", async () => {
  try {
    const signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });
    const authHeader = { headers: { "x-auth": signInResponse.data.token } };

    const donorId = (await badhanAxios.get("/users/me", authHeader)).data.donor
      ._id;

    /* ── create a platelet donation dated “today” ─────────────── */
    const plateletDonationDate = Date.now(); // ⬅️ now
    await badhanAxios.post(
      "/platelet-donations",
      { donorId, date: plateletDonationDate },
      authHeader
    );

    /* ── query window: ±15 days around the platelet donation date ─────── */
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const startDate = plateletDonationDate - 15 * ONE_DAY_MS; // ⬅️ −15 days
    const endDate = plateletDonationDate + 15 * ONE_DAY_MS; // ⬅️ +15 days

    const getReportsResponse = await badhanAxios.get(
      `/platelet-donations/report?startDate=${startDate}&endDate=${endDate}`, // ⬅️
      authHeader
    );
    expect(validate(getReportsResponse.data, getPlateletDonationReportsSchema).errors).toEqual(
      []
    );

    /* ── cleanup ─────────────────────────────────────────────── */
    await badhanAxios.delete(
      `/platelet-donations?donorId=${donorId}&date=${plateletDonationDate}`,
      authHeader
    );
    await badhanAxios.delete("/users/signout", authHeader);
  } catch (e) {
    throw processError(e);
  }
});
