const fs = require('fs')
const archiver = require('archiver')
const extract = require('extract-zip')
const resolve = require('path').resolve
const child_process = require('child_process')

const mongotools = require('./mongotools')

const firebaseStorage = require('./storage');

const backupController = async () => {
  console.log('backup command initiated')
  let folderName = new Date().getTime()

  console.log('fetching database...')
  var child = child_process.spawnSync(mongotools.mongodumpPath, ['--out=backup/' + folderName,
    process.env.MONGODB_URI_PROD], { encoding: 'utf8' })
  console.log('Process finished.')
  if (child.error) {
    console.log('ERROR: ', child.error)
    return
  }
  console.log('stdout: ', child.stdout)
  console.log('stderr: ', child.stderr)
  console.log('exit code: ', child.status)

  console.log('fetching database completed.')

  var output = fs.createWriteStream('backup/' + folderName + '.zip')
  var archive = archiver('zip')

  output.on('close', async () => {
    console.log('compressing database files completed')

    console.log('uploading to cloud...')
    await firebaseStorage.uploadFile(`backup/${folderName}.zip`,`backup/${folderName}.zip`)
    console.log('uploading to cloud completed')
  })

  archive.on('error', function (err) {
    throw err
  })
  archive.pipe(output)
  archive.directory('./backup/' + folderName, false)
  await archive.finalize()

}
const deleteController = async (argv) => {
  console.log('delete command initiated')
  console.log('time: ', argv.time)

  console.log('fetching backups from cloud...')
  let backupList = await firebaseStorage.getBackupList()
  console.log('fetching backups from cloud completed')

  if (!backupList.includes(argv.time)) {
    console.log('backup with specified timestamp not found')
    return
  }
  console.log('backup found with specified timestamp')

  console.log('deleting backup...')
  await firebaseStorage.deleteFile(`backup/${argv.time}.zip`)

  console.log('successfully deleted backup')
}
const listController = async () => {
  console.log('list command initiated')

  console.log('fetching backups from cloud...')
  let backupList = await firebaseStorage.getBackupList()
  console.log('fetching backups from cloud completed')

  console.log('found backups:')
  backupList.forEach((timeStamp) => {
    console.log(new Date(timeStamp).toLocaleString(), ' (timestamp: ', timeStamp, ')')
  })
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
    return
  }
  console.log('backup found with specified timestamp')

  console.log('downloading backup...')
  await firebaseStorage.downloadFile(`backup/${argv.time}.zip`,`./backup/${argv.time}.zip`)
  console.log('backup downloaded')

  console.log('extracting backup...')
  const targetPath = `./backup/${argv.time}.zip`
  const unpackPath = `./backup/${argv.time}`
  const resolvedUnpackPath = resolve(unpackPath)
  console.log('extracting ' + targetPath + ' to ' + resolvedUnpackPath)

  await extract(targetPath, { dir: resolvedUnpackPath })
  console.log('extracting backup completed')

  console.log('restoring backup...')
  const child = child_process.spawnSync(mongotools.mongorestorePath, ['--drop', `--dir=backup/${argv.time}/Badhan`, mongoURI], { encoding: 'utf8' })
  console.log('Process finished.')
  if (child.error) {
    console.log('ERROR: ', child.error)
  }
  console.log('stdout: ', child.stdout)
  console.log('stderr: ', child.stderr)
  console.log('exit code: ', child.status)
}

const pruneController = async()=>{
  console.log("prune command initiated")
  console.log('fetching backup list from cloud...')
  let backupList = await firebaseStorage.getBackupList()
  console.log('fetching backup list from cloud completed')
  backupList = backupList.reverse().slice(3)

  for(let i = 0 ; i < backupList.length; i++){
    console.log(`deleting backup ${backupList[i]}`)
    await firebaseStorage.deleteFile(`backup/${backupList[i]}.zip`)
  }
}

const restoreLatestController = async(argv)=>{
  console.log("restoreLatest command initiated")
  console.log('fetching backup list from cloud...')
  let backupList = await firebaseStorage.getBackupList()
  console.log('fetching backup list from cloud completed')
  if(backupList.length===0){
    console.log("No backups found")
    return
  }

  argv.time = backupList[backupList.length-1]
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
