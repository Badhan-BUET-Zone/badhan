const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

const patchAdminsSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
    },
    required: ["status", "statusCode", "message"]
};

test('PATCH/admins', async () => {
    try {
        //sign in for authorization
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        //get all hall admins and select the first one to track
        let designatedDonorsResponse = await badhanAxios.get('/donors/designation', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let sampleHallAdminID = designatedDonorsResponse.data.adminList[0]._id;
        let sampleHallAdminHall = designatedDonorsResponse.data.adminList[0].hall;
        //create a new donor
        let donorCreationResponse = await badhanAxios.post("/donors", {
            phone: 8801555444777,
            bloodGroup: 2,
            hall: sampleHallAdminHall,
            name: "Blah Blah",
            studentId: 1606060,
            address: "Azimpur",
            roomNumber: "3009",
            comment: "developer of badhan",
            extraDonationCount: 2,
            availableToAll: true
        }, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        // promote that newly created donor to volunteer
        await badhanAxios.patch('/donors/designation', {
            donorId:donorCreationResponse.data.newDonor._id,
            promoteFlag:true
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        // promote to hall admin
        let hallAdminPromotionResult = await badhanAxios.patch('/admins',{
            donorId: donorCreationResponse.data.newDonor._id
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        })

        // validate hall admin promotion result
        let hallAdminPromotionValidation = validate(hallAdminPromotionResult.data, patchAdminsSchema);

        expect(hallAdminPromotionValidation.errors).toEqual([]);

        // make the old hall admin
        await badhanAxios.patch('/admins',{
            donorId: sampleHallAdminID
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        })

        //demote the newly promoted volunteer to a normal donor
        await badhanAxios.patch('/donors/designation', {
            donorId:donorCreationResponse.data.newDonor._id,
            promoteFlag:false
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        //delete the new donor
        await badhanAxios.delete("/donors?donorId="+donorCreationResponse.data.newDonor._id,  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        //logout to remove token
        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
    } catch (e) {
        throw processError(e);
    }
})

test('PATCH/guest/admins',async()=>{
    let hallAdminPromotionResult = await badhanAxios.patch('/guest/admins',{
        donorId: '123456'
    },{

    })

    // validate hall admin promotion result
    let hallAdminPromotionValidation = validate(hallAdminPromotionResult.data, patchAdminsSchema);

    expect(hallAdminPromotionValidation.errors).toEqual([]);
})
