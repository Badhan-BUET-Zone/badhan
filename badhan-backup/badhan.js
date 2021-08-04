const dotenv = require('dotenv')
const yargs = require('yargs');

dotenv.config( { path : './config/config.env'} )

const controllers = require('./controllers');
yargs.command({
    command: 'backup',
    describe: 'Backup the mongodb database to firebase storage',
    handler: controllers.backupController
})

yargs.command({
    command: 'list',
    describe: 'Get the list of backups of mongodb database from firebase storage',
    handler:controllers.listController
})

yargs.command({
    command: 'delete',
    describe: 'Remove a backup using timestamp',
    builder:{
        time: {
            describe: 'Backup specified by the timestamp will be deleted.',
            demandOption: true,
            type: 'number'
        }
    },
    handler: controllers.deleteController
})

yargs.command({
    command: 'restore',
    describe: 'Restore a backup using timestamp',
    builder:{
        time: {
            describe: 'The backup having the specified timestamp will be restored',
            demandOption: true,
            type: 'number'
        },
        production: {
            describe: 'If true, then the backup will be restored to the production database',
            type: 'boolean',
            default: false,
        }
    },
    handler: controllers.restoreController
})
yargs.parse();
