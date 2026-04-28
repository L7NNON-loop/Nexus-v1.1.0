import express from 'express';
import QRCode from 'qrcode';

export function createHttpServer({ config, sessionManager }) {
  const app = express();
  app.use(express.json());

  app.get('/', (_, res) => {
    res.json({
      ok: true,
      bot: config.botName,
      version: config.version,
      sessions: sessionManager.listSessions(),
    });
  });

  app.post('/connect', async (req, res) => {
    const session = String(req.body?.session || 'principal').toLowerCase();
    await sessionManager.startSession(session);
    res.json({ ok: true, session, message: 'Sessão inicializada.' });
  });

  app.get('/qr/:session', async (req, res) => {
    const session = req.params.session.toLowerCase();
    const qrRaw = sessionManager.lastQrMap.get(session);
    if (!qrRaw) {
      return res.status(404).json({ ok: false, message: 'QR não disponível.' });
    }
    const qrImage = await QRCode.toDataURL(qrRaw);
    res.json({ ok: true, session, qrRaw, qrImage });
  });

  app.post('/code/:session', async (req, res) => {
    const session = req.params.session.toLowerCase();
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (!phone) {
      return res.status(400).json({ ok: false, message: 'Telefone inválido.' });
    }
    const code = await sessionManager.requestPairingCode(session, phone);
    return res.json({ ok: true, session, code });
  });

  return app;
}
