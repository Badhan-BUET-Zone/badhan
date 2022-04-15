const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');

const duplicateDonorsManySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        donors: {
            type: "array",
            minItems: 10,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    donorId: {
                        "anyOf":[{
                            type: "string", minLength: 24, maxLength: 24
                        },{
                            const : "FORBIDDEN"
                        }]},
                    phone: {type: "number"}
                },
                required: ["donorId","phone"]
            },
        },
    },
    required: ["status", "statusCode", "message", "donors"]
}

test('GET/donors/phone',async()=>{
    try{
        let superAdminSignInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let donorCreationResponse = await badhanAxios.post("/donors", {
            phone: 8801555444777,
            bloodGroup: 2,
            hall: 5,
            name: "Blah Blah",
            studentId: 1606060,
            address: "Azimpur",
            roomNumber: "3009",
            comment: "developer of badhan",
            extraDonationCount: 2,
            availableToAll: true
        }, {
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        });

        // promote that newly created donor to volunteer
        let promotionResponse = await badhanAxios.patch('/donors/designation', {
            donorId:donorCreationResponse.data.newDonor._id,
            promoteFlag:true
        },{
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        });

        let donorsPasswordPostResponse = await badhanAxios.post('/donors/password',{donorId:donorCreationResponse.data.newDonor._id},{
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        })
        let volunteerToken = donorsPasswordPostResponse.data.token

        let searchQuery
        searchQuery = {
            bloodGroup: 2,
            hall: env.VOLUNTEER_HALL,
            batch: '',
            name: '',
            address: '',
            isAvailable: true,
            isNotAvailable: true,
            availableToAll: false,
        }

        let superAdminSearchResultsForVolunteersHall = await badhanAxios.get(`/search/v3?bloodGroup=${searchQuery.bloodGroup}&hall=${searchQuery.hall}&batch=${searchQuery.batch}&name=${searchQuery.name}&address=${searchQuery.address}&isAvailable=${searchQuery.isAvailable}&isNotAvailable=${searchQuery.isNotAvailable}&availableToAll=${searchQuery.availableToAll}`,{
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        })

        expect(superAdminSearchResultsForVolunteersHall.data.filteredDonors.length).toBeGreaterThanOrEqual(5)

        let hallThatIsNotOfVolunteer
        for(hallThatIsNotOfVolunteer = 0; hallThatIsNotOfVolunteer <7; hallThatIsNotOfVolunteer++){
            if(hallThatIsNotOfVolunteer!==env.VOLUNTEER_HALL){
                break
            }
        }

        searchQuery = {
            bloodGroup: 2,
            hall: hallThatIsNotOfVolunteer,
            batch: '',
            name: '',
            address: '',
            isAvailable: true,
            isNotAvailable: true,
            availableToAll: false,
        }

        let superAdminSearchResultsForOtherHall = await badhanAxios.get(`/search/v3?bloodGroup=${searchQuery.bloodGroup}&hall=${searchQuery.hall}&batch=${searchQuery.batch}&name=${searchQuery.name}&address=${searchQuery.address}&isAvailable=${searchQuery.isAvailable}&isNotAvailable=${searchQuery.isNotAvailable}&availableToAll=${searchQuery.availableToAll}`,{
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        })

        expect(superAdminSearchResultsForOtherHall.data.filteredDonors.length).toBeGreaterThanOrEqual(5)

        let listOfPhones = []
        listOfPhones.push(...superAdminSearchResultsForOtherHall.data.filteredDonors.map(donor=>donor.phone))
        listOfPhones.push(...superAdminSearchResultsForVolunteersHall.data.filteredDonors.map(donor=>donor.phone))

        let phoneListQuery = '?phoneList='+listOfPhones.join('&phoneList=')
        let existingDonorsResponse = await badhanAxios.get(`/donors/phone${phoneListQuery}`,{
            headers: {
                "x-auth": volunteerToken
            }
        })
        let existingDonorValidationResult = validate(existingDonorsResponse.data, duplicateDonorsManySchema)

        expect(existingDonorValidationResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": volunteerToken
            }
        });

        await badhanAxios.delete("/donors?donorId="+donorCreationResponse.data.newDonor._id,  {
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        });

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        });


    } catch (e) {
        throw processError(e);
    }
})
