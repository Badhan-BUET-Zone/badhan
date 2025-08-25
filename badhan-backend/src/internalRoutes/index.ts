/* tslint:disable:typedef no-console no-var-requires */
import express, { Router, Request, Response, NextFunction } from 'express'
import { ensureMongoTools } from './download_tools'
import '../db/mongoose' // ensure mongoose connection is initialized (cached if already connected)
import rateLimiter from '../middlewares/rateLimiter'
import { param, validationResult } from 'express-validator'
import { spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'

// --- Load config/config.env into process.env (non‑destructive) -----------------
// Provides MONGODB_URI_PROD, MONGODB_URI_TEST, MONGODB_URI_LOCAL for backup utilities
// Only sets vars that are currently undefined to avoid clobbering runtime/env vars.
(() => {
  try {
    const cfgPath = path.resolve('config', 'config.env')
    if (!fs.existsSync(cfgPath)) return
    const lines = fs.readFileSync(cfgPath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue
      const idx = line.indexOf('=')
      if (idx === -1) continue
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (key && !(key in process.env)) process.env[key] = value
    }
  } catch (e) {
    console.log('[backup] failed to load config/config.env:', (e as Error).message)
  }
})()
// dynamic requires for libs without type defs
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdmZip = require('adm-zip')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const extract = require('extract-zip')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const firebaseAdmin = require('firebase-admin')
// express-queue (CommonJS import to get function)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const queueFactory = require('express-queue')

import OKResponse200 from '../response/models/successTypes/OKResponse200'
import CreatedResponse201 from '../response/models/successTypes/CreatedResponse201'
import BadRequestError400 from '../response/models/errorTypes/BadRequestError400'
import NotFoundError404 from '../response/models/errorTypes/NotFoundError404'
import ForbiddenError403 from '../response/models/errorTypes/ForbiddenError403'
import InternalServerError500 from '../response/models/errorTypes/InternalServerError500'

// Router containing only internal endpoints (backup utilities etc). NOT mounted publicly.
const router: Router = express.Router()

// Queue middleware similar to badhan-backup commonQueue
const commonQueue = queueFactory({ activeLimit: 1, queuedLimit: -1 })

// Simple demo endpoint: GET /hello -> "hello world"
router.get('/hello', (_req: Request, res: Response): void => {
  res.type('text/plain').send('hello world')
})

// --- Validation helpers (ported from badhan-backup) ---
const validatePARAMDate = param('date')
  .exists().withMessage('date is required')
  .bail()
  .isInt().withMessage('date must be integer')
  .toInt()

const runValidations = (validations: any[]) => async (req: Request, res: Response, next: NextFunction) => {
  await Promise.all(validations.map(v => v.run(req)))
  const errors = validationResult(req)
  if (errors.isEmpty()) return next()
  return res.status(400).send(new BadRequestError400(errors.array()[0].msg, {}))
}

const validateDELETEBackup = runValidations([validatePARAMDate])
const validatePOSTRestore = runValidations([validatePARAMDate])

// --- Firebase storage setup (lightweight replication) ---
// Expect service account JSON file path via env BADHAN_FIREBASE_SERVICE_ACCOUNT (fallback to local relative path like backup project)
let firebaseInitialized = false
const ensureFirebase = () => {
  if (firebaseInitialized) return
  const svcPath = process.env.BADHAN_FIREBASE_SERVICE_ACCOUNT || path.resolve('config', 'badhan-buet-1d20b088a755.json')
  if (!fs.existsSync(svcPath)) {
    console.log(`[backup] Firebase service account not found at ${svcPath}; backup routes will fail until provided.`)
    return
  }
  const serviceAccount = JSON.parse(fs.readFileSync(svcPath, 'utf8'))
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    storageBucket: process.env.BADHAN_FIREBASE_STORAGE_BUCKET || 'badhan-buet.appspot.com'
  })
  firebaseInitialized = true
}

const storageBucket = () => {
  ensureFirebase()
  return firebaseAdmin.storage().bucket()
}

const storage = {
  getBackupList: async (): Promise<number[]> => {
    const bucket = storageBucket()
    if (!bucket) return []
    const [files] = await bucket.getFiles({ prefix: 'backup/' })
    const list: number[] = []
    files.forEach((file: any) => {
      if (file.name.endsWith('.zip') && file.name.startsWith('backup/')) {
        const ts = parseInt(file.name.substring(7).split('.').slice(0, -1).join('.'), 10)
        if (!isNaN(ts)) list.push(ts)
      }
    })
    return list
  },
  deleteFile: async (cloudPath: string) => {
    const bucket = storageBucket(); if (!bucket) return
    await bucket.deleteFiles({ prefix: cloudPath })
  },
  downloadFile: async (cloudPath: string, localPath: string) => {
    const bucket = storageBucket(); if (!bucket) throw new Error('bucket not init')
    await bucket.file(cloudPath).download({ destination: localPath })
  },
  uploadFile: async (localPath: string, cloudPath: string) => {
    const bucket = storageBucket(); if (!bucket) throw new Error('bucket not init')
    await bucket.upload(localPath, { destination: cloudPath })
  }
}

// --- Mongotools replication ---
const isWin = process.platform === 'win32'
const mongotoolsBase = path.resolve('mongotools', 'bin')
const mongodumpPath = path.join(mongotoolsBase, `mongodump${isWin ? '.exe' : ''}`)
const mongorestorePath = path.join(mongotoolsBase, `mongorestore${isWin ? '.exe' : ''}`)

const ensureMongoToolExists = (toolPath: string) => {
  if (!fs.existsSync(toolPath)) {
    console.log(`[backup] ${toolPath} not found; see backup setup instructions.`)
    return false
  }
  return true
}

// --- Controllers (ported) ---
const backupController = async () => {
  console.log('[backup] backup command initiated')
  const folderName = new Date().getTime().toString()

  // Ensure tools only when needed (mongodump)
  await ensureMongoTools()

  if (!ensureMongoToolExists(mongodumpPath)) {
    return new InternalServerError500('mongodump binary missing', {}, {})
  }

  console.log('[backup] fetching database...')
  const child = spawnSync(mongodumpPath, ['--out=backup/' + folderName, process.env.MONGODB_URI_PROD || ''], { encoding: 'utf8' })
  // print child process output for debugging
  console.log('[backup] mongodump output:', child.stdout)
  console.log('[backup] mongodump error (if any):', child.stderr)
  if (child.error) {
    console.log('[backup] ERROR:', child.error)
    return new InternalServerError500('Error in spawning child process', { error: child.error }, {})
  }
  console.log('[backup] creating zip...')
  const zip = new AdmZip()
  zip.addLocalFolder('./backup/' + folderName)
  zip.writeZip('backup/' + folderName + '.zip')
  console.log('[backup] zip created')
  try {
    await storage.uploadFile(`backup/${folderName}.zip`, `backup/${folderName}.zip`)
  } catch (e: any) {
    return new InternalServerError500('Upload failed', { error: e?.message }, {})
  }
  return new CreatedResponse201('Successfully created backup', {
    output: child.stdout,
    error: child.stderr,
    childStatus: child.status,
    time: folderName
  })
}

const deleteController = async ({ time }: { time: number }) => {
  console.log('[backup] delete command initiated time=', time)
  const backupList = await storage.getBackupList()
  if (!backupList.includes(time)) {
    return new NotFoundError404('backup with specified timestamp not found', {})
  }
  await storage.deleteFile(`backup/${time}.zip`)
  return new OKResponse200('successfully deleted backup', {})
}

const listController = async () => {
  const backupList = await storage.getBackupList()
  backupList.sort().reverse()
  return new OKResponse200('Successfully fetched list of backups', { backups: backupList })
}

const restoreController = async ({ time, production, development }: { time: number, production: boolean, development: boolean }) => {
  console.log('[backup] restore command initiated time=', time)
  if (production) {
    return new ForbiddenError403('Production restore is not allowed', {})
  }
  let mongoURI = process.env.MONGODB_URI_LOCAL || ''
  if (development) mongoURI = process.env.MONGODB_URI_TEST || mongoURI
  console.log('[backup] using mongoURI:', mongoURI)
  const backupList = await storage.getBackupList()
  if (!backupList.includes(time)) {
    return new NotFoundError404('backup with specified timestamp not found', {})
  }
  try {
    await storage.downloadFile(`backup/${time}.zip`, `./backup/${time}.zip`)
  } catch (e: any) {
    return new InternalServerError500('Download failed', { error: e?.message }, {})
  }
  const targetPath = `./backup/${time}.zip`
  const unpackPath = `./backup/${time}`
  try {
    await extract(targetPath, { dir: path.resolve(unpackPath) })
  } catch (e: any) {
    return new InternalServerError500('Extraction failed', { error: e?.message }, {})
  }
  // Ensure tools only when needed (mongorestore)
  await ensureMongoTools()
  if (!ensureMongoToolExists(mongorestorePath)) {
    return new InternalServerError500('mongorestore binary missing', {}, {})
  }
  const child = spawnSync(mongorestorePath, ['--drop', `--dir=backup/${time}/Badhan`, mongoURI], { encoding: 'utf8' })
  if (child.error) {
    return new InternalServerError500('Child process spawnsync failed', { error: child.error }, {})
  }
  return new OKResponse200('Backup successfully restored', {
    childSpawn: {
      output: child.stdout,
      error: child.stderr,
      childStatus: child.status
    },
    argv: { time, production, development }
  })
}

const pruneController = async () => {
  let backupList = await storage.getBackupList()
  backupList = backupList.reverse().slice(3)
  for (const ts of backupList) {
    await storage.deleteFile(`backup/${ts}.zip`)
  }
  return new OKResponse200('Deleted all older databases', {})
}

const populateController = async () => {
  const backendPath = path.resolve(process.cwd())
  const child = spawnSync('npm', ['run', 'populate_db:local'], { cwd: backendPath, encoding: 'utf8' })
  if (child.error || child.status !== 0) {
    return new InternalServerError500('Populate script failed', { error: child.error }, {
      output: child.stdout,
      error: child.stderr,
      childStatus: child.status
    })
  }
  return new OKResponse200('Successfully populated local database', {
    output: child.stdout,
    error: child.stderr,
    childStatus: child.status
  })
}

const resetController = async () => {
  const backendPath = path.resolve(process.cwd())
  console.log('[reset] resetting local database...')
  const child = spawnSync('npm', ['run', 'reset_db:local'], { cwd: backendPath, encoding: 'utf8' })
  if (child.error || child.status !== 0) {
    return new InternalServerError500('Reset script failed', { error: child.error }, {
      output: child.stdout,
      error: child.stderr,
      childStatus: child.status
    })
  }
  console.log('[reset] local database reset successfully')
  return new OKResponse200('Successfully reset local database', {
    output: child.stdout,
    error: child.stderr,
    childStatus: child.status
  })
}

// small helper to simulate original wait for prune route
const wait = () => new Promise(resolve => setTimeout(() => resolve(0), 3000))

// --- Routes (mirroring badhan-backup/routes/index.js) ---
router.delete('/backup/old',
  rateLimiter.commonLimiter,
  commonQueue,
  async (_req: Request, res: Response) => {
    await wait()
    const response: any = await pruneController()
    return res.status(response.statusCode).send(response)
  })

router.delete('/backup/date/:date',
  validateDELETEBackup,
  rateLimiter.commonLimiter,
  commonQueue,
  async (req: Request, res: Response) => {
  const response: any = await deleteController({ time: parseInt(req.params.date, 10) })
    return res.status(response.statusCode).send(response)
  })

router.get('/backup',
  rateLimiter.commonLimiter,
  commonQueue,
  async (_req: Request, res: Response) => {
    const response: any = await listController()
    return res.status(response.statusCode).send(response)
  })

router.post('/backup',
  rateLimiter.commonLimiter,
  commonQueue,
  async (_req: Request, res: Response) => {
    const response: any = await backupController()
    return res.status(response.statusCode).send(response)
  })

router.post('/restore/:date',
  validatePOSTRestore,
  rateLimiter.commonLimiter,
  commonQueue,
  async (req: Request, res: Response) => {
    const response: any = await restoreController({
      production: req.query.production === 'true',
      development: req.query.development === 'true',
  time: parseInt(req.params.date, 10)
    })
    return res.status(response.statusCode).send(response)
  })

router.post('/reset-local-db',
  commonQueue,
  async (_req: Request, res: Response) => {
    const response: any = await resetController()
    return res.status(response.statusCode).send(response)
  })

router.post('/populate-local-db',
  commonQueue,
  async (_req: Request, res: Response) => {
    const response: any = await populateController()
    return res.status(response.statusCode).send(response)
  })

export default router
