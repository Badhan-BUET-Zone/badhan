import 'reflect-metadata'
import { Controller, Get, Route, Tags, Hidden } from 'tsoa'
import dotenv from '../dotenv'
import fs from 'fs'
import path from 'path'
import { HTTP_STATUS } from '../constants'

const DEPLOY_FILE: string = path.resolve(__dirname, '../../../last_deployed.txt')
let lastDeployed: string = 'unknown'
try {
  lastDeployed = fs.readFileSync(DEPLOY_FILE, 'utf8').trim()
} catch {
  // leave default; avoid hard-crash if file is missing
}

@Route('')
@Tags('Other')
export class OtherController extends Controller {
  /**
   * Online check endpoint - returns server status
   */
  @Get('')
  @Hidden()
  public async onlineCheck(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message:
        `Badhan backend API is online! environment: ${dotenv.NODE_ENV}. ` +
        `Last deployed: ${lastDeployed}`
    }
  }

  /**
   * Deprecated endpoint handler
   */
  @Get('deprecated')
  @Hidden()
  public async deprecated(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    this.setStatus(HTTP_STATUS.NOT_FOUND)
    return {
      status: 'ERROR',
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Please update your app'
    }
  }

  /**
   * Under maintenance endpoint handler
   */
  @Get('maintenance')
  @Hidden()
  public async underMaintenance(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    this.setStatus(HTTP_STATUS.NOT_FOUND)
    return {
      status: 'ERROR',
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'This feature is currently under maintenance'
    }
  }
}

