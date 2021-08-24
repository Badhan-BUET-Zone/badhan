const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

console.log("Connecting to "+(String(process.env.MONGODB_URI).includes('Test')?"Test":"Production")+" database...")

mongoose.connect(process.env.MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => {
    console.log('You are connected to the database.');
}).catch(err => {
    console.log(err.message);
    process.exit();
});

module.exports = {mongoose};
