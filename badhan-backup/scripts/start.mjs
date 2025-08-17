import { runProcessesInParallel } from './parallel.mjs';
import { killPorts } from './port_cleanup.mjs';
import { cleanUp } from './clean_all_dependencies.mjs';
import { ensureNpmInstall } from './ensure_npm_install.mjs';

const args = process.argv.slice(2);

await killPorts([27017, 3000, 8080, 4000]);

const cleanUpRequired = args.includes('--clean')

if(cleanUpRequired) {
  await cleanUp([
    '../../badhan-backend/node_modules',
    '../../badhan-frontend/node_modules',
    '../../badhan-backend-test/node_modules',
    '../../badhan-frontend-test/node_modules',
    '../../badhan-backup/mongodb_local',
    '../../badhan-backend/dist',
    '../../badhan-frontend/dist',
    '../../badhan-backup/scripts/.npm_install_stamps'
  ]);
}

await ensureNpmInstall("./badhan-backend")
await ensureNpmInstall("./badhan-frontend")
await ensureNpmInstall("./badhan-backend-test")
await ensureNpmInstall("./badhan-frontend-test")
await ensureNpmInstall("./badhan-backup");


const jobs = [
  { workingDir: './badhan-backup', cmd: 'node scripts/start_db.mjs', label: 'database'},
  { workingDir: './badhan-backup', cmd: 'node download_tools.mjs && npx nodemon', label: 'backup'},
  { workingDir: './badhan-frontend', cmd: 'node ../badhan-backup/scripts/wait_for_port.mjs 3000 && npm run serve:local', label: 'frontend'},
  { workingDir: './badhan-backend', cmd: 'node ../badhan-backup/scripts/wait_for_port.mjs 27017 && npx nodemon', label: 'backend'}
];

if(cleanUpRequired){
  jobs.splice(1, 0, { workingDir: './badhan-backend', cmd: 'node ../badhan-backup/scripts/wait_for_port.mjs 27017 && npm run reset_db:local', label: 'database reset'})
}

runProcessesInParallel(jobs).catch(err => {
  console.error('One or more processes failed:', err);
});
