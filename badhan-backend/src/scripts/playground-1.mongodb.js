/* global use, db */
// MongoDB Playground
// To disable this template go to Settings | MongoDB | Use Default Template For Playground.
// Make sure you are connected to enable completions and to be able to run a playground.
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.
// The result of the last command run in a playground is shown on the results panel.
// By default the first 20 documents will be returned with a cursor.
// Use 'console.log()' to print to the debug output.
// For more documentation on playgrounds please refer to
// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

// Select the database to use.
use('Badhan-Test');
startTime = 1714521600000;
endTime = 1717113600000;
// Insert a few documents into the sales collection.
db.donors.aggregate([
  {
      $lookup: {
          from: "donations",
          localField: "_id",
          foreignField: "donorId",
          as: "donor_donations"
      }
  },
  {
      $unwind: "$donor_donations"
  },
  {
      $group: {
          _id: "$_id",
          firstDonationTime: { $min: "$donor_donations.date" }
      }
  },
  {
      $match: {
          firstDonationTime: {
              $gte: startTime,
              $lte: endTime
          }
      }
  },
  {
      $count: "numberOfFirstDonations"
  }
])

