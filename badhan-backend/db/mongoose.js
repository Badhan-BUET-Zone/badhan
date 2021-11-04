const mongoose = require('mongoose');


mongoose.Promise = global.Promise;

console.log("BADHAN LOG: Connecting to "+(String(process.env.MONGODB_URI).includes('Test')?"Test":"Production")+" database...")

const connectToDB=async()=>{
    try{
        mongoose.connect(process.env.MONGODB_URI, {
            useUnifiedTopology: true,
            useNewUrlParser: true,
        },()=>{console.log('BADHAN LOG: You are connected to the database.');})
    }catch (e) {
        console.log(e.message);
        process.exit();
    }
}

connectToDB();

process.on('SIGINT', async function () {
    console.error('SIGINT called');
    await mongoose.disconnect();
    console.error('Mongoose connection terminated');
    process.exit(0);
});

process.on('SIGTERM', async function () {
    console.error('SIGTERM called');
    await mongoose.disconnect();
    console.error('Mongoose connection terminated');
    process.exit(0);
});

module.exports = {mongoose};
