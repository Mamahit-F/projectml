import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(FRONTEND_DIR, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const ML_DIR = path.join(ROOT_DIR, 'ml-service');

const BACKEND_JAR = path.join(BACKEND_DIR, 'target', 'studentinsight-backend-1.0.0.jar');
const ML_PYTHON = path.join(ML_DIR, '.venv', 'Scripts', 'python.exe');
const PG_SERVICE = 'postgresql-x64-18';
const LOCAL_PG_CANDIDATES = [
  process.env.PG_HOME,
  'D:\\pgsql',
].filter(Boolean);

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  coral: '\x1b[38;5;203m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const children = [];
let shuttingDown = false;

function log(tag, color, msg) {
  const lines = String(msg).replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    if (line.trim().length > 0) {
      console.log(`${color}${COLORS.bold}[${tag}]${COLORS.reset} ${line}`);
    }
  }
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensurePostgres() {
  if (await isPortOpen(5432)) {
    log('SYSTEM', COLORS.green, 'PostgreSQL sudah aktif di port 5432.');
    return true;
  }

  // 1. Prefer working local/portable PostgreSQL installation (e.g., D:\pgsql) — no UAC prompt needed
  for (const pgHome of LOCAL_PG_CANDIDATES) {
    const pgCtl = path.join(pgHome, 'bin', 'pg_ctl.exe');
    const pgData = path.join(pgHome, 'data');
    const pgLog = path.join(pgHome, 'server.log');
    if (fs.existsSync(pgCtl) && fs.existsSync(path.join(pgData, 'PG_VERSION'))) {
      log('SYSTEM', COLORS.yellow, `PostgreSQL (port 5432) belum aktif. Menyalakan PostgreSQL lokal dari ${pgHome}...`);
      const res = spawnSync(pgCtl, ['-D', pgData, '-l', pgLog, 'start'], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 25000,
      });
      if (res.status === 0 || (await waitForPort(5432, 12000))) {
        if (await waitForPort(5432, 8000)) {
          log('SYSTEM', COLORS.green, `PostgreSQL lokal (${pgHome}) berhasil dinyalakan di port 5432!`);
          return true;
        }
      }
      log('SYSTEM', COLORS.yellow, `Gagal menyalakan PostgreSQL lokal di ${pgHome}. Mencoba layanan Windows...`);
    }
  }

  log('SYSTEM', COLORS.yellow, `PostgreSQL (port 5432) belum aktif. Mencoba menyalakan layanan ${PG_SERVICE}...`);

  // 2. Fallback: Attempt direct Windows service start (succeeds immediately if terminal is elevated)
  spawnSync('sc', ['start', PG_SERVICE], { stdio: 'ignore', windowsHide: true });
  if (await waitForPort(5432, 4000)) {
    log('SYSTEM', COLORS.green, 'PostgreSQL berhasil dinyalakan.');
    return true;
  }

  // 3. Fallback: If interactive Windows session, request UAC permission to start the Windows service
  if (process.platform === 'win32' && process.stdin.isTTY) {
    log('SYSTEM', COLORS.yellow, 'Meminta izin Administrator Windows (UAC) untuk menyalakan PostgreSQL — silakan klik "Yes"...');
    spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Start-Process sc.exe -ArgumentList 'start','${PG_SERVICE}' -Verb RunAs -Wait`,
      ],
      { stdio: 'ignore' }
    );
    if (await waitForPort(5432, 12000)) {
      log('SYSTEM', COLORS.green, 'PostgreSQL berhasil dinyalakan dan siap digunakan!');
      return true;
    }
  }

  log(
    'SYSTEM',
    COLORS.red,
    `PostgreSQL masih berhenti. Pastikan PostgreSQL di D:\\pgsql atau layanan "${PG_SERVICE}" berjalan di port 5432 lalu jalankan "npm run dev" lagi.`
  );
  return false;
}

function attachProcess(tag, color, child) {
  children.push(child);
  child.stdout?.on('data', (chunk) => log(tag, color, chunk.toString()));
  child.stderr?.on('data', (chunk) => log(tag, color, chunk.toString()));
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      log(tag, COLORS.red, `Berhenti dengan kode keluar ${code}.`);
    }
  });
}

function killAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  log('SYSTEM', COLORS.yellow, 'Menghentikan seluruh layanan StudentInsight...');
  for (const child of children) {
    if (!child || !child.pid) continue;
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
  }
  process.exit(0);
}

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

async function main() {
  console.log(`\n${COLORS.coral}${COLORS.bold}=====================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}  StudentInsight — Peluncur Otomatis Seluruh Layanan${COLORS.reset}`);
  console.log(`${COLORS.coral}${COLORS.bold}=====================================================${COLORS.reset}\n`);

  const pgReady = await ensurePostgres();
  if (!pgReady) {
    process.exit(1);
  }

  // 1. Start Python ML & PDF Service (8001)
  if (await isPortOpen(8001)) {
    log('ML-PDF', COLORS.cyan, 'Layanan Pembaca PDF & Prediksi sudah aktif di port 8001.');
  } else {
    if (!fs.existsSync(ML_PYTHON)) {
      log('ML-PDF', COLORS.red, `Python virtual environment tidak ditemukan di: ${ML_PYTHON}`);
      process.exit(1);
    }
    log('ML-PDF', COLORS.cyan, 'Menyalakan Layanan Pembaca PDF & Analisis Risiko (port 8001)...');
    const mlChild = spawn(
      ML_PYTHON,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001'],
      { cwd: ML_DIR, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
    );
    attachProcess('ML-PDF', COLORS.cyan, mlChild);
  }

  // 2. Start Spring Boot Backend (8080)
  if (await isPortOpen(8080)) {
    log('SERVER', COLORS.coral, 'Server Utama sudah aktif di port 8080.');
  } else {
    if (!fs.existsSync(BACKEND_JAR)) {
      log('SERVER', COLORS.red, `File paket server tidak ditemukan di: ${BACKEND_JAR}`);
      log('SERVER', COLORS.yellow, 'Jalankan "mvn -s D:\\m2_repo\\settings.xml package -DskipTests" di folder backend terlebih dahulu.');
      killAll();
      return;
    }
    log('SERVER', COLORS.coral, 'Menyalakan Server Utama StudentInsight (port 8080)...');
    const backendChild = spawn(
      'java',
      ['-Xms128m', '-Xmx384m', '-jar', BACKEND_JAR],
      { cwd: BACKEND_DIR, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
    );
    attachProcess('SERVER', COLORS.coral, backendChild);
  }

  // 3. Start Vite Frontend (5173) directly via Node (100% safe for paths with spaces)
  log('WEB', COLORS.green, 'Menyalakan Antarmuka Web (http://localhost:5173)...');
  const viteEntry = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  const webChild = spawn(process.execPath, [viteEntry], {
    cwd: FRONTEND_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: false,
  });
  attachProcess('WEB', COLORS.green, webChild);

  webChild.on('exit', () => {
    killAll();
  });
}

main().catch((err) => {
  log('SYSTEM', COLORS.red, err?.message || String(err));
  killAll();
});
