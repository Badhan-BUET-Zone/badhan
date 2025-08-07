#!/usr/bin/env node
// wait-for-port.mjs — Wait until a port is open and accepting connections

import net from 'node:net';

const [, , portArg] = process.argv;
const port = parseInt(portArg, 10);

if (!port || isNaN(port)) {
  console.error('❌ Please provide a valid port number as an argument.');
  process.exit(1);
}

const RETRY_INTERVAL_MS = 500;

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(port, '127.0.0.1');
  });
}

async function waitForPort(port) {
  process.stdout.write(`⏳ Waiting for port ${port}...\n`);
  while (!(await checkPort(port))) {
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
  }
  console.log(`\n✅ Port ${port} is now accepting connections.`);
}

waitForPort(port);
