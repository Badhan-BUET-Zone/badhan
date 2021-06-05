const {Donor} = require('../db/models/Donor');
const execution=async ()=>{
    try{
        let result=await Donor.find({tokens:{$exists:true}});
        console.log(result.length);
    }catch(e){
        console.log(e);
    }
}

execution();