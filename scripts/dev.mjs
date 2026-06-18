import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 3000);
const viteBin = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
const children = new Set();
let shuttingDown = false;

function isPortOpen(port, host = BACKEND_HOST) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return false;
}

function run(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  children.add(child);
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      console.error(`[dev] ${name} encerrou (${signal || (code ?? 0)}).`);
      shutdown(code || 1);
    }
  });

  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    child.kill('SIGTERM');
  }

  setTimeout(() => process.exit(code), 250);
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));

const backendAlreadyRunning = await isPortOpen(BACKEND_PORT);

if (backendAlreadyRunning) {
  console.log(`[dev] API ja esta rodando em http://${BACKEND_HOST}:${BACKEND_PORT}`);
} else {
  console.log(`[dev] Subindo API em http://${BACKEND_HOST}:${BACKEND_PORT}`);
  run('API', ['server.js']);
  const ready = await waitForPort(BACKEND_PORT);
  if (!ready) {
    console.warn(`[dev] API ainda nao respondeu na porta ${BACKEND_PORT}. O Vite vai subir mesmo assim.`);
  }
}

run('Vite', [viteBin, '--host', '0.0.0.0']);
