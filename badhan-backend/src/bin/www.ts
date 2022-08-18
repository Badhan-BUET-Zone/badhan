/**
 * Module dependencies.
 */

import app from '../app'
import DebugLibrary from 'debug'
const debug = DebugLibrary('badhan-backend:server')

import http from 'http'

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000')
app.set('port', port)

/**
 * Create HTTP server.
 */

const server = http.createServer(app)

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort (val: string) {
  const rawPort = parseInt(val, 10)

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

function onError (error: ErrnoException) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      // tslint:disable-next-line:no-console
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      // tslint:disable-next-line:no-console
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening () {
  const addr = server.address()
  // https://stackoverflow.com/questions/40349987/how-to-suppress-error-ts2533-object-is-possibly-null-or-undefined
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr!.port
  debug('Listening on ' + bind)
}
