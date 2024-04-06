// @ts-nocheck
/* tslint:disable */
const {mongoose} = require('../db/mongoose');
import { DonorModel } from "../db/models/Donor";
import { year2000TimeStamp } from "../constants";
DonorModel.updateMany(
        { commentTime: { $lt: year2000TimeStamp } }, 
        { $set: { date: year2000TimeStamp } },
)
.exec()
.then(res => {
    console.log('Number of documents matched:', res.n);
    console.log('Number of documents modified:', res.nModified);
})
.catch(err => console.log(err));
