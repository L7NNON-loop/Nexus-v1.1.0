import path from 'path';
import fs from 'fs';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { runCommand } from './commands.js';

export function createSessionManager({ config, dataStore }) {
  const sessions = new Map();
  const lastQrMap = new Map();
  const pairingCache = new Map();

  async function startSession(sessionName = 'principal') {
    if (sessions.has(sessionName)) {
      return sessions.get(sessionName);
    }

    const authDir = path.resolve('sessions', sessionName);
    fs.mkdirSync(authDir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      defaultQueryTimeoutMs: 60_000,
      browser: ['Nexus', 'Chrome', '1.1.360.187.12'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        lastQrMap.set(sessionName, qr);
      }
      if (connection === 'open') {
        dataStore.update((s) => {
          s.sessions[sessionName] = {
            connected: true,
            updatedAt: new Date().toISOString(),
          };
          return s;
        });
      }
      if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          sessions.delete(sessionName);
          await startSession(sessionName);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        await runCommand({
          config,
          sock,
          msg,
          sessionName,
          dataStore,
          sessionManager: api,
          lastQrMap,
        });
      }
    });

    const record = { sock, sessionName };
    sessions.set(sessionName, record);
    return record;
  }

  async function requestPairingCode(sessionName, phoneNumber) {
    const record = sessions.get(sessionName) || (await startSession(sessionName));
    const code = await record.sock.requestPairingCode(phoneNumber);
    return code;
  }

  async function getOfficialConnectCode(sessionName = 'principal', phoneNumber = config.officialWaNumber) {
    const cacheKey = `${sessionName}:${phoneNumber}`;
    const cached = pairingCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAtMs > now) {
      return {
        code: cached.code,
        expiresAt: new Date(cached.expiresAtMs).toISOString(),
      };
    }

    const code = await requestPairingCode(sessionName, phoneNumber);
    const expiresAtMs = now + (config.codeTtlSec * 1000);
    pairingCache.set(cacheKey, { code, expiresAtMs });

    return {
      code,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  function listSessions() {
    return [...sessions.keys()];
  }

  const api = {
    startSession,
    requestPairingCode,
    getOfficialConnectCode,
    listSessions,
    lastQrMap,
  };

  return api;
}
