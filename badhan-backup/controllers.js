const extract = require('extract-zip')
const resolve = require('path').resolve
const child_process = require('child_process')
const AdmZip = require("adm-zip");
const mongotools = require('./mongotools')

const firebaseStorage = require('./storage');
const {InternalServerError500, BadRequestError400, NotFoundError404} = require("./response/errorTypes");
const {CreatedResponse201, OKResponse200} = require("./response/successTypes");

const backupController = async (callback) => {
    console.log('backup command initiated')
    let folderName = new Date().getTime()

    console.log('fetching database...')
    console.log(mongotools.mongodumpPath+" "+"--out=backup/"+folderName+" "+process.env.MONGODB_URI_PROD)
    var child = child_process.spawnSync(mongotools.mongodumpPath, ['--out=backup/' + folderName,
        process.env.MONGODB_URI_PROD], {encoding: 'utf8'})
    console.log('Process finished.')
    if (child.error) {
        console.log('ERROR: ', child.error)
        console.log("RESPOND CALLED on child process")
        return new InternalServerError500('Error in spawning child process',{error:child.error})
    }
    console.log('stdout: ', child.stdout)
    console.log('stderr: ', child.stderr)
    console.log('exit code: ', child.status)
    console.log('fetching database completed.')

    console.log(`creating zip...`);
    const zip = new AdmZip();
    zip.addLocalFolder('./backup/' + folderName);
    zip.writeZip('backup/' + folderName + '.zip');
    console.log(`creating zip successful`);

    console.log('uploading to cloud...')
    await firebaseStorage.uploadFile(`backup/${folderName}.zip`, `backup/${folderName}.zip`)
    console.log('uploading to cloud completed')

    return new CreatedResponse201('Successfully created backup',{
        output: child.stdout,
        error: child.stderr,
        childStatus: child.status,
        time: folderName
    })
}
const deleteController = async (argv) => {
    console.log('delete command initiated')
    console.log('time: ', argv.time)

    console.log('fetching backups from cloud...')
    let backupList = await firebaseStorage.getBackupList()
    console.log('fetching backups from cloud completed')

    if (!backupList.includes(argv.time)) {
        console.log('backup with specified timestamp not found')
        return new NotFoundError404('backup with specified timestamp not found')
    }
    console.log('backup found with specified timestamp')

    console.log('deleting backup...')
    await firebaseStorage.deleteFile(`backup/${argv.time}.zip`)

    console.log('successfully deleted backup')
    return new OKResponse200('successfully deleted backup')
}
const listController = async () => {
    console.log('list command initiated')

    console.log('fetching backups from cloud...')
    let backupList = await firebaseStorage.getBackupList()
    backupList.sort().reverse()
    console.log('fetching backups from cloud completed')

    console.log('found backups:')
    backupList.forEach((timeStamp) => {
        console.log(new Date(timeStamp).toLocaleString(), ' (timestamp: ', timeStamp, ')')
    })
    return new OKResponse200('Successfully fetched list of backups',{backups: backupList})
}

const restoreController = async (argv) => {
    console.log('restore command initiated')
    console.log('time: ', argv.time)
    console.log('restore to production: ', argv.production)

    let mongoURI = process.env.MONGODB_URI_TEST

    if (argv.production === true) {
        mongoURI = process.env.MONGODB_URI_PROD
    }

    console.log('fetching backups from cloud...')
    let backupList = await firebaseStorage.getBackupList()
    console.log('fetching backups from cloud completed')

    if (!backupList.includes(argv.time)) {
        console.log('backup with specified timestamp not found')
        return new NotFoundError404('backup with specified timestamp not found')
    }
    console.log('backup found with specified timestamp')

    console.log('downloading backup...')
    await firebaseStorage.downloadFile(`backup/${argv.time}.zip`, `./backup/${argv.time}.zip`)
    console.log('backup downloaded')

    console.log('extracting backup...')
    const targetPath = `./backup/${argv.time}.zip`
    const unpackPath = `./backup/${argv.time}`
    const resolvedUnpackPath = resolve(unpackPath)
    console.log('extracting ' + targetPath + ' to ' + resolvedUnpackPath)

    await extract(targetPath, {dir: resolvedUnpackPath})
    console.log('extracting backup completed')

    console.log('restoring backup...')
    const child = child_process.spawnSync(mongotools.mongorestorePath, ['--drop', `--dir=backup/${argv.time}/Badhan`, mongoURI], {encoding: 'utf8'})
    console.log('Process finished.')
    if (child.error) {
        console.log('ERROR: ', child.error)
        return new InternalServerError500('Child process spawnsync failed')
    }
    console.log('stdout: ', child.stdout)
    console.log('stderr: ', child.stderr)
    console.log('exit code: ', child.status)
    return new OKResponse200('Backup successfully restored',{
        childSpawn: {
            output: child.stdout,
            error: child.stderr,
            childStatus: child.status,
        },
        argv
    })
}

const pruneController = async () => {
    console.log("prune command initiated")
    console.log('fetching backup list from cloud...')
    let backupList = await firebaseStorage.getBackupList()
    console.log('fetching backup list from cloud completed')
    backupList = backupList.reverse().slice(3)

    for (let i = 0; i < backupList.length; i++) {
        console.log(`deleting backup ${backupList[i]}`)
        await firebaseStorage.deleteFile(`backup/${backupList[i]}.zip`)
    }

    return new OKResponse200('Deleted all older databases')
}

const restoreLatestController = async (argv) => {
    console.log("restoreLatest command initiated")
    console.log('fetching backup list from cloud...')
    let backupList = await firebaseStorage.getBackupList()
    console.log('fetching backup list from cloud completed')
    if (backupList.length === 0) {
        console.log("No backups found")
        return
    }

    argv.time = backupList[backupList.length - 1]
    await restoreController(argv)
}

module.exports = {
    backupController,
    deleteController,
    listController,
    restoreController,
    pruneController,
    restoreLatestController
}
