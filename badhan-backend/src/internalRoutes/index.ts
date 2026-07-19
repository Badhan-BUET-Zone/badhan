/* tslint:disable:typedef no-console no-var-requires */
import express, { Router, Request, Response, NextFunction } from 'express'
import { ensureMongoTools } from './download_tools'
import '../db/mongoose' // ensure mongoose connection is initialized (cached if already connected)
import rateLimiter from '../middlewares/rateLimiter'
import { param, validationResult } from 'express-validator'
import { spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { clearDatabase } from '../db/test/clearDatabase'
import { generateFakeData } from '../db/test/populate'

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
import ServiceUnavailableError503 from '../response/models/errorTypes/ServiceUnavailableError503'
import { generateSchemaInconsistencies } from '../services/schemaInconsistencies'

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

// Machine readable reason so the frontend can render setup instructions instead of a generic error
export const FIREBASE_CREDENTIALS_MISSING = 'FIREBASE_CREDENTIALS_MISSING'

const firebaseServiceAccountPath = () =>
  process.env.BADHAN_FIREBASE_SERVICE_ACCOUNT || path.resolve('config', 'badhan-buet-1d20b088a755.json')

class FirebaseCredentialsError extends Error {
  public readonly reason = FIREBASE_CREDENTIALS_MISSING
  public readonly expectedPath: string
  constructor (message: string, expectedPath: string) {
    super(message)
    this.expectedPath = expectedPath
  }
}

// Builds the 503 response describing exactly where the credential file is expected
const firebaseUnavailableResponse = (e: FirebaseCredentialsError) =>
  new ServiceUnavailableError503(e.message, {
    reason: e.reason,
    expectedPath: e.expectedPath,
    expectedFileName: path.basename(e.expectedPath),
    instructions: [
      `Obtain the Firebase service account JSON for the Badhan project from a maintainer.`,
      `Save it as badhan-backend/config/${path.basename(e.expectedPath)} (the config folder is gitignored, create it if missing).`,
      `Alternatively set BADHAN_FIREBASE_SERVICE_ACCOUNT to the absolute path of the file.`,
      `Restart the internal server (docker compose restart internal) and reload this page.`
    ]
  })

let firebaseInitialized = false
const ensureFirebase = () => {
  if (firebaseInitialized) return
  const svcPath = firebaseServiceAccountPath()
  if (!fs.existsSync(svcPath)) {
    console.log(`[backup] Firebase service account not found at ${svcPath}; backup routes are disabled until provided.`)
    throw new FirebaseCredentialsError(`Firebase service account file not found at ${svcPath}`, svcPath)
  }
  let serviceAccount
  try {
    serviceAccount = JSON.parse(fs.readFileSync(svcPath, 'utf8'))
  } catch (e: any) {
    console.log(`[backup] Firebase service account at ${svcPath} is not valid JSON:`, e?.message)
    throw new FirebaseCredentialsError(`Firebase service account file at ${svcPath} is not valid JSON`, svcPath)
  }
  try {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
      storageBucket: process.env.BADHAN_FIREBASE_STORAGE_BUCKET || 'badhan-buet.appspot.com'
    })
  } catch (e: any) {
    console.log(`[backup] Firebase initialization failed:`, e?.message)
    throw new FirebaseCredentialsError(`Firebase initialization failed: ${e?.message}`, svcPath)
  }
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
    if (e instanceof FirebaseCredentialsError) throw e
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
    if (e instanceof FirebaseCredentialsError) throw e
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
  try {
    const result = await generateFakeData()
    if (!result.ok) {
      return new InternalServerError500('Populate script failed', { error: (result as any).error }, {})
    }
    return new OKResponse200('Successfully populated local database', {})
  } catch (e: any) {
    return new InternalServerError500('Populate script threw exception', { error: e?.message }, {})
  }
}

const purgeController = async () => {
  console.log('[purge] purging local database...')
  try {
    const result = await clearDatabase()
    if (!result.ok) {
      return new InternalServerError500('Purge script failed', { error: (result as any).error }, {})
    }
    console.log('[purge] local database purged successfully')
    return new OKResponse200('Successfully purged local database', {})
  } catch (e: any) {
    return new InternalServerError500('Purge script threw exception', { error: e?.message }, {})
  }
}

// small helper to simulate original wait for prune route
const wait = () => new Promise(resolve => setTimeout(() => resolve(0), 3000))

// Runs a controller and always replies. Without this a throw inside an async handler
// (e.g. missing firebase credentials) leaves the request hanging until the socket is
// closed, which the browser reports as ERR_EMPTY_RESPONSE.
const handle = (controller: (req: Request) => Promise<any>) =>
  async (req: Request, res: Response) => {
    let response: any
    try {
      response = await controller(req)
    } catch (e: any) {
      if (e instanceof FirebaseCredentialsError) {
        response = firebaseUnavailableResponse(e)
      } else {
        console.log('[backup] unhandled error:', e)
        response = new InternalServerError500('Unexpected error', { error: e?.message }, {})
      }
    }
    return res.status(response.statusCode).send(response)
  }

// --- Routes (mirroring badhan-backup/routes/index.js) ---
router.delete('/backup/old',
  rateLimiter.commonLimiter,
  commonQueue,
  handle(async () => {
    await wait()
    return pruneController()
  }))

router.delete('/backup/date/:date',
  validateDELETEBackup,
  rateLimiter.commonLimiter,
  commonQueue,
  handle(async (req: Request) => deleteController({ time: parseInt(req.params.date, 10) })))

router.get('/backup',
  rateLimiter.commonLimiter,
  commonQueue,
  handle(async () => listController()))

router.post('/backup',
  rateLimiter.commonLimiter,
  commonQueue,
  handle(async () => backupController()))

router.post('/restore/:date',
  validatePOSTRestore,
  rateLimiter.commonLimiter,
  commonQueue,
  handle(async (req: Request) => restoreController({
    production: req.query.production === 'true',
    development: req.query.development === 'true',
    time: parseInt(req.params.date, 10)
  })))

router.post('/purge-local-db',
  commonQueue,
  handle(async () => purgeController()))

router.post('/populate-local-db',
  commonQueue,
  handle(async () => populateController()))

// Generate in-memory schema inconsistencies report (no filesystem writes)
router.get('/schema-inconsistencies',
  commonQueue,
  async (_req: Request, res: Response) => {
    try {
      const data = await generateSchemaInconsistencies()
      // Direct JSON (not wrapped in OKResponse200 to preserve nested key names as specified)
      return res.status(200).json(data)
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to generate schema inconsistencies', message: e?.message })
    }
  })

export default router
