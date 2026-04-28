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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const record = {
      sock,
      sessionName,
      state,
      status: state.creds?.registered ? 'connected' : 'waiting_auth',
      lastPairingCode: null,
      lastPairingExpiresAt: null,
    };

    sessions.set(sessionName, record);

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      if (state.creds?.registered) {
        record.status = 'connected';
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        lastQrMap.set(sessionName, qr);
      }

      if (connection === 'open') {
        record.status = 'connected';
        dataStore.update((s) => {
          s.sessions[sessionName] = {
            connected: true,
            updatedAt: new Date().toISOString(),
          };
          return s;
        });
      }

      if (connection === 'close') {
        record.status = 'disconnected';
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

    return record;
  }

  async function requestPairingCode(sessionName, phoneNumber) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
    if (!cleanPhone) {
      throw new Error('Telefone inválido para gerar pairing code.');
    }

    const record = sessions.get(sessionName) || (await startSession(sessionName));

    if (record.state.creds?.registered) {
      return {
        code: null,
        connected: true,
        message: `Sessão ${sessionName} já conectada.`,
      };
    }

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const code = await record.sock.requestPairingCode(cleanPhone);
        const expiresAtMs = Date.now() + (config.codeTtlSec * 1000);
        record.lastPairingCode = code;
        record.lastPairingExpiresAt = new Date(expiresAtMs).toISOString();
        pairingCache.set(`${sessionName}:${cleanPhone}`, {
          code,
          expiresAtMs,
        });

        return {
          code,
          connected: false,
          expiresAt: record.lastPairingExpiresAt,
          message: 'Código gerado com sucesso.',
        };
      } catch (error) {
        lastError = error;
        await sleep(1500);
      }
    }

    throw lastError || new Error('Falha ao gerar pairing code.');
  }

  async function getOfficialConnectCode(sessionName = 'principal', phoneNumber = config.officialWaNumber) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
    const cacheKey = `${sessionName}:${cleanPhone}`;
    const cached = pairingCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAtMs > now) {
      return {
        code: cached.code,
        expiresAt: new Date(cached.expiresAtMs).toISOString(),
      };
    }

    const result = await requestPairingCode(sessionName, cleanPhone);
    return {
      code: result.code,
      expiresAt: result.expiresAt || null,
      connected: Boolean(result.connected),
      message: result.message,
    };
  }

  function listSessions() {
    return [...sessions.values()].map((s) => ({
      sessionName: s.sessionName,
      status: s.status,
      connected: Boolean(s.state.creds?.registered),
      lastPairingExpiresAt: s.lastPairingExpiresAt,
    }));
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
