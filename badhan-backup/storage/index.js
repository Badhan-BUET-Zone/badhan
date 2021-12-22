const admin = require('firebase-admin')
const fs = require("fs");

if (!fs.existsSync('./config/badhan-buet-2177eeab149f.json')) {
  console.log("LOG: config/badhan-buet-2177eeab149f.json does not exist");
  process.exit(1)
}

const serviceAccount = require('../config/badhan-buet-2177eeab149f.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'badhan-buet.appspot.com'
})

var bucket = admin.storage().bucket()

const getBackupList = async () => {
  const [files] = await bucket.getFiles({ prefix: 'backup/' })

  let newFileList = []
  files.forEach(file => {
    if (file.name.endsWith('.zip') && file.name.startsWith('backup/')) {
      newFileList.push(parseInt(file.name.substr(7).split('.').slice(0, -1).join('.')))
    }
  })
  return newFileList
}

const deleteFile = async(fileName)=>{
  await bucket.deleteFiles({
    prefix: fileName
  }, (err) => {
    if (!err) {
    }
  })
}

const downloadFile = async(cloudFilePath,localFilePath)=>{
  await bucket.file(cloudFilePath).download({ destination: localFilePath})
}
const uploadFile = async(localFilePath,cloudFilePath)=>{
  await bucket.upload(localFilePath, {
    destination: cloudFilePath
  })
}

module.exports = {
  bucket,
  getBackupList,
  deleteFile,
  downloadFile,
  uploadFile
}