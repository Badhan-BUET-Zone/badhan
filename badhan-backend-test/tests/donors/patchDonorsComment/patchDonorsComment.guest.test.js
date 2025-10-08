const { patchCommentSchema } = require("../schemas");
const operations = require("../../lib/operations");

test("PATCH/guest/donors/comment: guest", async () => {
    const response = await operations.guestPatchDonorComment();
    // Schema validation happens inside helper; extra assertion optional
    // Re-validate with specific schema if needed
    operations.validateSchema(response.data, patchCommentSchema);
});
