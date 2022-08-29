/**
 * Module dependencies.
 */

import app from '../app'
import DebugLibrary from 'debug'
import SourceMapSupport from 'source-map-support'
import http from 'http'
import myConsole from "../response/myConsole";
import {AddressInfo} from "net";

const debug: DebugLibrary.Debugger = DebugLibrary('badhan-backend:server')
SourceMapSupport.install()

/**
 * Get port from environment and store in Express.
 */

/**
 * Normalize a port into a number, string, or false.
 */

const normalizePort: (val: string)=> string | number | boolean = (val: string): string|number|boolean => {
  const rawPort: number = parseInt(val, 10)

  if (isNaN(rawPort)) {
    // named pipe
    return val
  }

  if (rawPort >= 0) {
    // port number
    return rawPort
  }

  return false
}

const port: string|number|boolean = normalizePort(process.env.PORT || '3000')
app.set('port', port)

/**
 * Create HTTP server.
 */

const server:http.Server = http.createServer(app)

/**
 * Listen on provided port, on all network interfaces.
 */

const onError:(error: ErrnoException)=>void = (error: ErrnoException):void =>{
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind: string = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      myConsole.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      myConsole.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

const onListening:()=>void = ():void =>{
  const addr: string | AddressInfo | null = server.address()
  // https://stackoverflow.com/questions/40349987/how-to-suppress-error-ts2533-object-is-possibly-null-or-undefined
  const bind: string = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr!.port
  debug('Listening on ' + bind)
}

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Event listener for HTTP server "error" event.
 */

interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  path?: string;
  syscall?: string;
  stack?: string;
}
