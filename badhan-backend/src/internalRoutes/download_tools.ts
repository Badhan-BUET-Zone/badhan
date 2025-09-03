// Simplified TypeScript adaptation of badhan-backup/download_tools.mjs
// Provides a programmatic API to ensure MongoDB database tools (mongodump, mongorestore)
// are downloaded into ./mongotools/bin. Export ensureMongoTools() for callers.

/* tslint:disable:typedef no-console */
import { createWriteStream, chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { request } from 'https'
import { spawnSync } from 'child_process'
import { pipeline } from 'stream/promises'

const DEFAULT_VERSION = process.env.TOOLS_VERSION || '100.9.4'
const OUT_DIR = join(process.cwd(), 'mongotools')
const BIN_DIR = join(OUT_DIR, 'bin')
const BASE = 'https://fastdl.mongodb.org/tools/db/'

const PLATFORM = process.platform // 'win32' | 'darwin' | 'linux'
const ARCH = process.arch // 'x64' | 'arm64' | etc.

function mapArch (platform: string, arch: string): string {
  if (platform === 'linux') {
    if (arch === 'x64') return 'x86_64'
    if (arch === 'arm64') return 'aarch64'
  }
  if (platform === 'darwin') {
    if (arch === 'x64') return 'x86_64'
    if (arch === 'arm64') return 'arm64'
  }
  if (platform === 'win32') {
    return 'x86_64'
  }
  throw new Error(`Unsupported platform/arch combo: ${platform}/${arch}`)
}

function buildFilename (platform: string, archMapped: string, version: string): string {
  if (platform === 'linux') return `mongodb-database-tools-linux-${archMapped}-${version}.tgz`
  if (platform === 'darwin') return `mongodb-database-tools-macos-${archMapped}-${version}.zip`
  if (platform === 'win32') return `mongodb-database-tools-windows-${archMapped}-${version}.zip`
  throw new Error(`Unsupported platform: ${platform}`)
}

async function headOk (url: string): Promise<boolean> {
  return await new Promise(resolve => {
    const req = request(url, { method: 'HEAD' }, res => {
      resolve(!!res.statusCode && res.statusCode >= 200 && res.statusCode < 300)
    })
    req.on('error', () => resolve(false))
    req.end()
  })
}

async function download (url: string, toPath: string): Promise<void> {
  await new Promise((resolve, reject) => {
    const file = createWriteStream(toPath)
    const req = request(url, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy()
        download(res.headers.location, toPath).then(resolve, reject)
        return
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`Download failed: ${res.statusCode} ${res.statusMessage}`))
        return
      }
      pipeline(res, file).then(resolve, reject)
    })
    req.on('error', reject)
    req.end()
  })
}

function extract (archivePath: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true })
  if (PLATFORM === 'linux' || PLATFORM === 'darwin') {
    if (archivePath.endsWith('.tgz') || archivePath.endsWith('.tar.gz')) {
      const r = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], { stdio: 'inherit' })
      if (r.status !== 0) throw new Error('Extraction failed (tar)')
    } else if (archivePath.endsWith('.zip')) {
      const r = spawnSync('ditto', ['-x', '-k', archivePath, destDir], { stdio: 'inherit' })
      if (r.status !== 0) throw new Error('Extraction failed (ditto unzip)')
    } else {
      throw new Error(`Unknown archive format: ${archivePath}`)
    }
  } else if (PLATFORM === 'win32') {
    const ps = [
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      'Expand-Archive',
      '-LiteralPath', archivePath,
      '-DestinationPath', destDir,
      '-Force'
    ]
    const r = spawnSync(ps[0], ps.slice(1), { stdio: 'inherit' })
    if (r.status !== 0) throw new Error('Extraction failed (Expand-Archive)')
  } else {
    throw new Error(`Unsupported platform for extraction: ${PLATFORM}`)
  }
}

function findExtractedRoot (dir: string): string {
  const entries = readdirSync(dir, { withFileTypes: true })
  const match = entries.find(e => e.isDirectory() && e.name.startsWith('mongodb-database-tools-'))
  if (!match) throw new Error('Could not locate extracted tools folder')
  return join(dir, match.name)
}

function installBinaries (extractedRoot: string): void {
  mkdirSync(BIN_DIR, { recursive: true })
  const srcBin = join(extractedRoot, 'bin')
  const candidates = ['mongodump', 'mongorestore']
  for (const base of candidates) {
    const src = PLATFORM === 'win32' ? join(srcBin, `${base}.exe`) : join(srcBin, base)
    const dst = PLATFORM === 'win32' ? join(BIN_DIR, `${base}.exe`) : join(BIN_DIR, base)
    if (!existsSync(src)) throw new Error(`Expected binary not found in archive: ${src}`)
    copyFileSync(src, dst)
    if (PLATFORM !== 'win32') chmodSync(dst, 0o755)
    console.log(`[mongo-tools] Installed ${dst}`)
  }
}

function binariesPresent (): boolean {
  if (!existsSync(BIN_DIR)) return false
  const bins = ['mongodump', 'mongorestore'].map(b => PLATFORM === 'win32' ? `${b}.exe` : b)
  return bins.every(b => existsSync(join(BIN_DIR, b)))
}

export async function ensureMongoTools (): Promise<void> {
  try {
    if (binariesPresent()) return
    const archMapped = mapArch(PLATFORM, ARCH)
    const filename = buildFilename(PLATFORM, archMapped, DEFAULT_VERSION)
    const url = BASE + filename
    console.log(`[mongo-tools] Ensuring tools version ${DEFAULT_VERSION} (${PLATFORM}/${ARCH} -> ${archMapped})`)
    if (!await headOk(url)) {
      console.error(`[mongo-tools] Tools not found at ${url}`)
      return
    }
    mkdirSync(OUT_DIR, { recursive: true })
    mkdirSync(BIN_DIR, { recursive: true })
    const tmpPath = join(tmpdir(), filename)
    console.log(`[mongo-tools] Downloading to ${tmpPath}`)
    await download(url, tmpPath)
    const extractDir = join(tmpdir(), `mdb-tools-extract-${Date.now()}`)
    extract(tmpPath, extractDir)
    const root = findExtractedRoot(extractDir)
    installBinaries(root)
  try { rmSync(tmpPath, { force: true }) } catch { /* ignore tmp cleanup error */ }
  try { rmSync(extractDir, { recursive: true, force: true }) } catch { /* ignore extract dir cleanup error */ }
    console.log('[mongo-tools] Installation complete')
  } catch (e: any) {
    console.error('[mongo-tools] Failed to install tools:', e?.message || e)
  }
}

// Allow running directly (node dist/internalRoutes/download_tools.js)
if (require.main === module) {
  ensureMongoTools().then(() => process.exit(0))
}
