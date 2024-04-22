// @ts-nocheck
/* tslint:disable */
const {mongoose} = require('../db/mongoose');
import { DonorModel } from "../db/models/Donor";
import { ActiveDonorModel } from "../db/models/ActiveDonor";
import { CallRecordModel } from "../db/models/CallRecord";
import { DonationModel } from "../db/models/Donation";
import { LogModel } from "../db/models/Log";
import { PublicContactModel } from "../db/models/PublicContact";
import { TokenModel } from "../db/models/Token";

async function validateModels() {
    await new Promise(r => setTimeout(r, 5000));
    const models = [DonorModel, ActiveDonorModel, CallRecordModel, DonationModel, LogModel, PublicContactModel, TokenModel]
    models.forEach(async (Model)=>{
        console.log(Model, "started")
        const documents = await Model.find();
    
        documents.forEach((doc) => {
            const validationError = doc.validateSync();
            
            if (validationError) {
            console.log(`Validation error in model ${Model}:`, validationError);
            }
        });
        console.log("done")
    })
}
  
validateModels().catch(console.error);