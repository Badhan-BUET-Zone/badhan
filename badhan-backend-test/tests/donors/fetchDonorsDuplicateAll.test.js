const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');

const duplicateDonorsManySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status:      { type: "string" },
    statusCode:  { const: 200 },
    message:     { type: "string" },

    donors: {
      type: "array",
      minItems: 1,

      /* every item must still satisfy the per‑element rules … */
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          donorId: {
            oneOf: [
              { type: "string", minLength: 24, maxLength: 24 },
              { const: "FORBIDDEN" }
            ]
          },
          phone: { type: "number" }
        },
        required: ["donorId", "phone"]
      },

      /* …and the array, as a whole, must contain BOTH kinds */
      allOf: [
        /* ➊ at least one 24‑character donorId */
        {
          contains: {
            type: "object",
            required: ["donorId"],
            properties: {
              donorId: { type: "string", minLength: 24, maxLength: 24 }
            }
          }
          /* 1 is the default, so minContains isn’t needed */
        },

        /* ➋ at least one "FORBIDDEN" donorId */
        {
          contains: {
            type: "object",
            required: ["donorId"],
            properties: {
              donorId: { const: "FORBIDDEN" }
            }
          }
        }
      ]
    }
  },
  required: ["status", "statusCode", "message", "donors"]
};


const newDonor_1_info = {
    phone: 8801500000001,
    bloodGroup: 2,
    hall: 2,
    name: "Blah Blah",
    studentId: 1606060,
    address: "Azimpur",
    roomNumber: "3009",
    comment: "developer of badhan",
    extraDonationCount: 2,
    availableToAll: true
}

const newDonor_2_info = {
    phone: 8801500000002,
    bloodGroup: 2,
    hall: 3,
    name: "Blah Blah",
    studentId: 1606061,
    address: "Azimpur",
    roomNumber: "3009",
    comment: "developer of badhan",
    extraDonationCount: 2,
    availableToAll: false
}

test('GET/donors/phone',async()=>{
    try{
        const superAdminSignInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        const donor_1_creationResponse = await badhanAxios.post("/donors", newDonor_1_info, {
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        });
        const donor_2_creationResponse = await badhanAxios.post("/donors", newDonor_2_info, {
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        });

        await badhanAxios.patch('/donors/designation', {
            donorId: donor_1_creationResponse.data.newDonor._id,
            promoteFlag: true
        },{
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        });

        const volunteer_1_token_response = await badhanAxios.post('/donors/password', {
            donorId:donor_1_creationResponse.data.newDonor._id
        },{
            headers: {
                "x-auth": superAdminSignInResponse.data.token
            }
        });
        const voluneer_1_token = volunteer_1_token_response.data.token

        const listOfPhones = [newDonor_1_info.phone, newDonor_2_info.phone]
        const phoneListQuery = '?phoneList='+listOfPhones.join('&phoneList=')
    
        const existingDonorsResponse_1 = await badhanAxios.get(`/donors/phone${phoneListQuery}`,{
            headers: {
                "x-auth": voluneer_1_token
            }
        })

        const existingDonorValidationResult = validate(existingDonorsResponse_1.data, duplicateDonorsManySchema)
        expect(existingDonorValidationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})
