const fs = require("fs");

const isWin = process.platform === "win32";

const mongodumpPath = `./bin/mongodump`+(isWin?'.exe':'')
const mongorestorePath = `./bin/mongorestore`+(isWin?'.exe':'')

if (!fs.existsSync(mongodumpPath)) {
    console.log(`LOG: ${mongodumpPath} does not exist. Please read the instructions from https://github.com/Badhan-BUET-Zone/badhan-backup`);
    process.exit(1)
}

if (!fs.existsSync(mongorestorePath)) {
    console.log(`LOG: ${mongorestorePath} does not exist. Please read the instructions from https://github.com/Badhan-BUET-Zone/badhan-backup`);
    process.exit(1)
}

module.exports={
    mongorestorePath,
    mongodumpPath
}
