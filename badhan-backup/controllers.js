const fs = require('fs');
var archiver = require('archiver');
var unzipper = require('unzipper');
var admin = require("firebase-admin");
var serviceAccount = require("./storage/badhan-buet-2177eeab149f.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "badhan-buet.appspot.com"
});

var bucket = admin.storage().bucket();

const backupController = async () => {
    console.log("backup command initiated");
    let folderName = new Date().getTime()

    console.log("fetching database...")
    spawn = require('child_process').spawn
    let backupProcess = spawn('./mongodump', [
        '--out=backup/' + folderName,
        process.env.MONGODB_URI_PROD
    ]);

    backupProcess.on('exit', async (code, signal) => {
        if (code) {
            console.log('Backup process exited with code ', code);
        } else if (signal) {
            console.error('Backup process was killed with singal ', signal);
        } else {
            console.log("fetching database completed.")

            console.log("compressing database files...")
            var output = fs.createWriteStream('backup/' + folderName + '.zip');
            var archive = archiver('zip');

            output.on('close', async () => {
                // console.log(archive.pointer() + ' total bytes');
                // console.log('archiver has been finalized and the output file descriptor has closed.');
                console.log("compressing database files completed")

                console.log("uploading to cloud...");
                await bucket.upload('backup/' + folderName + '.zip', {
                    destination: 'backup/' + folderName + '.zip'
                });
                console.log("uploading to cloud completed");

                console.log("cleaning up...")
                fs.rmSync('./backup/' + folderName, {recursive: true});
                fs.rmSync('./backup/' + folderName + '.zip', {recursive: true});
                console.log("cleaning up completed")
            });

            archive.on('error', function (err) {
                throw err;
            });

            archive.pipe(output);

            archive.directory('./backup/' + folderName, false);

            archive.finalize();
        }
    });
}
const deleteController = async (argv) => {
    console.log("delete command initiated");
    console.log("time: ", argv.time);

    console.log("fetching backups from cloud...")
    let backupList = await getBackupList();
    console.log("fetching backups from cloud completed")

    if (!backupList.includes(argv.time)){
        console.log("backup with specified timestamp not found");
        return;
    }
    console.log("backup found with specified timestamp");

    console.log('deleting backup...');
    await bucket.deleteFiles({
        prefix: 'backup/'+argv.time+'.zip'
    }, (err)=>{
        if (!err) {
            // All files in the `images` directory have been deleted.
        }
    });
    console.log("successfully deleted backup")
}
const listController = async () => {
    console.log("list command initiated");

    console.log("fetching backups from cloud...")
    let backupList = await getBackupList();
    console.log("fetching backups from cloud completed")

    console.log('found backups:');
    backupList.forEach((timeStamp)=>{
        console.log(new Date(timeStamp).toLocaleString()," (timestamp: ",timeStamp,")")
    })
}

const getBackupList = async ()=>{
    const [files] = await bucket.getFiles({ prefix: 'backup/'});

    let newFileList = [];
    files.forEach(file => {
        if(file.name.endsWith('.zip') && file.name.startsWith('backup/'))
        {
            newFileList.push(parseInt(file.name.substr(7).split('.').slice(0, -1).join('.')));
        }
    });
    return newFileList;
}
const restoreController = async (argv) => {
    console.log("restore command initiated");
    console.log("time: ",argv.time);

    console.log("fetching backups from cloud...")
    let backupList = await getBackupList();
    console.log("fetching backups from cloud completed")

    if (!backupList.includes(argv.time)){
        console.log("backup with specified timestamp not found");
        return;
    }
    console.log("backup found with specified timestamp");

    console.log("downloading backup...")
    await bucket.file('backup/'+argv.time+'.zip').download({destination:'./backup/'+argv.time+'.zip'});
    console.log("backup downloaded");

    console.log("extracting backup...");
    fs.createReadStream('./backup/'+argv.time+'.zip')
        .pipe(unzipper.Extract({ path: './backup/'+argv.time }));
    console.log("extracting backup completed");

    console.log("restoring backup...");
    spawn = require('child_process').spawn
    let backupProcess = spawn('./mongorestore', [
        '--drop',
        '--dir=backup/'+argv.time+'/Badhan',
        process.env.MONGODB_URI_TEST
    ]);

    backupProcess.on('exit', async (code, signal) => {
        if (code) {
            console.log('Backup process exited with code ', code);
        } else if (signal) {
            console.error('Backup process was killed with singal ', signal);
        } else {
            console.log('Successfully restored the database');

            console.log('cleaning up...')
            fs.rmSync('./backup/' + argv.time, {recursive: true});
            fs.rmSync('./backup/' + argv.time + '.zip', {recursive: true});
        }
    });

}

module.exports = {
    backupController,
    deleteController,
    listController,
    restoreController
}
