const app = require('../app');
const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');

let enterDonorIdInDonations = async () => {
    let donationsQueryResult = await donationInterface.findDonationsByQuery();
    let donations = donationsQueryResult.data;
    let skipped = 0;

    for (const donation of donations) {
        // console.log(donation);
        if (donation.donorId) {
            skipped += 1;
            continue;
        }

        let donorsQueryResult = await donorInterface.findDonorsByQuery({phone: donation.phone});
        let donors = donorsQueryResult.data;

        // console.log(donors);

        for (const donor of donors) {
            if (donor.hall < 8) {
                donation.donorId = donor._id.toString();
                break;
            }
        }
        await donation.save();
    }
    return skipped;
}

enterDonorIdInDonations().then(res => {
    // console.log(res);
    console.log("Skipped = " + res);
    console.log('Finished');
}).catch(err => {
    console.log(err.message);
});