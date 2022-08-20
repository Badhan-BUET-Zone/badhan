import useragent from 'useragent'
import {Request, Response, NextFunction} from "express";

export interface IUserAgent {
  os: string,
  device: string,
  browserFamily: string,
  ipAddress: string
}

export const userAgentHandler = (req:Request, res: Response, next: NextFunction) => {
  const agent = useragent.parse(req.headers['user-agent'])
  const xForwardedForHeader = req.get('x-forwarded-for')
  res.locals.userAgent = {
    os: agent.os.toString(),
    device: agent.device.toString(),
    browserFamily: agent.family.toString(),
    ipAddress: xForwardedForHeader ? xForwardedForHeader.split(',').shift() : (req.socket ? req.socket.remoteAddress : '0.0.0.0')
  }
  // tslint:disable-next-line:no-console
  console.log('useragent os->', res.locals.userAgent.os, ' device->', res.locals.userAgent.device, ' family->', res.locals.userAgent.browserFamily, ' ip->', res.locals.userAgent.ipAddress)
  next()
}

