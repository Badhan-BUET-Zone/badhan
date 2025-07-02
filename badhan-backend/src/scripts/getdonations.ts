// @ts-nocheck
/* tslint:disable */
const fs = require('fs');

fs.readFile('output.json', 'utf8', (err, jsonString) => {
    if (err) {
        console.log("Error reading file from disk:", err);
        return;
    }
    try {
        let data = JSON.parse(jsonString);
        let donationZero = (donation) => {
            return donation.date !== 0;
        }
        
        data = data.filter(donationZero);

        data.sort((donation1, donation2)=> {
            if (donation1.date < donation2.date) {
                return -1;
            } else if (donation1.date > donation2.date) {
                return 1;
            } else {
                return 0;
            }
        }, )
        data.reverse()
        data.forEach(donation=>{
            console.log(donation.date, new Date(donation.date*1000))
        })
        console.log(data.length)
    } catch(err) {
        console.log('Error parsing JSON string:', err);
    }
});
