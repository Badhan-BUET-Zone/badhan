// @ts-nocheck
/* tslint:disable */
const {mongoose} = require('../db/mongoose');
import { DonationModel } from "../db/models/Donation";
const fs = require('fs');
const arrayOfDonations = []
const demo = async ()=>{
    const response = await DonationModel.aggregate([
        {
            $match: {
                date: {
                    $gte: 1707237110000,
                    $lt: 1717113600000
                }
            }
        },
        {
            $project: {
                year: { $toString: { $year: { $toDate: "$date" } } },
                month: { $toString: { $month: { $toDate: "$date" } } }
            }
        },
        {
            $group: {
                _id: { year: "$year", month: "$month" },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: "$_id.year",
                counts: {
                    $push: {
                        k: "$_id.month",
                        v: "$count"
                    }
                }
            }
        },
        {
            $addFields: {
                counts: { $arrayToObject: "$counts" }
            }
        },
        {
            $project: {
                _id: 0,
                year: "$_id",
                counts: 1
            }
        },
        {
            $group: {
                _id: null,
                years: {
                    $push: {
                        k: "$year",
                        v: "$counts"
                    }
                }
            }
        },
        {
            $replaceRoot: {
                newRoot: { $arrayToObject: "$years" }
            }
        }
    ])

    console.log(response)


    // const cursor = DonationModel.find().cursor();

    // const errorDocs = []

    // for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    //     console.log(doc._id)
    //     try {
    //         await DonationModel.aggregate([
    //             { $match: { _id: doc._id } },
    //             {
    //                 $match: {
    //                     date: {
    //                         $gte: 1707237110000,
    //                         $lt: 1717113600000
    //                     }
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     year: { $toString: { $year: { $toDate: "$date" } } },
    //                     month: { $toString: { $month: { $toDate: "$date" } } }
    //                 }
    //             },
    //         ]);
    //     } catch (error) {
    //         console.error('Error with document:', doc);
    //         errorDocs.push(doc)
    //     }
    // }
    // fs.writeFile('output.json', JSON.stringify(errorDocs, null, 2), (err) => {
    //     if (err) throw err;
    //     console.log('Data written to file');
    // });
    
}

demo()
