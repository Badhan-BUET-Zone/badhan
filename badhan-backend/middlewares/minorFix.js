const app = require('../app');
const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');

let enterDonorIdInDonations = async () => {
    let donations = await donationInterface.findDonationsByQuery();

    for(const donation of donations){
        let donors = donorInterface.findDonorsByQuery({ phone: donation.phone });

        for(const donor of donors){
            if (donor.hall < 8){
                donation.donorId = donor._id.toString();
                break;
            }
        }
        await donation.save();
    }
}

enterDonorIdInDonations().then().catch(err => {
    console.log(err.message);
});