import express from 'express';
import QRCode from 'qrcode';

export function createHttpServer({ config, sessionManager }) {
  const app = express();
  app.use(express.json());

  app.get('/', async (_, res) => {
    let codeConnect = null;

    try {
      codeConnect = await sessionManager.getOfficialConnectCode('principal', config.officialWaNumber);
    } catch {
      codeConnect = {
        code: null,
        expiresAt: null,
        warning: 'Não foi possível gerar o code agora. Tente novamente em instantes.',
      };
    }

    res.json({
      ok: true,
      bot: config.botName,
      version: config.version,
      waNumber: config.officialWaNumber,
      codeConnect,
      sessions: sessionManager.listSessions(),
    });
  });

  app.get('/connect', async (req, res) => {
    const session = String(req.query?.session || 'principal').toLowerCase();
    await sessionManager.startSession(session);
    res.json({
      ok: true,
      method: 'GET',
      session,
      message: 'Sessão iniciada via GET. Para integração, prefira POST /connect.',
    });
  });

  app.post('/connect', async (req, res) => {
    const session = String(req.body?.session || 'principal').toLowerCase();
    await sessionManager.startSession(session);
    res.json({ ok: true, method: 'POST', session, message: 'Sessão inicializada.' });
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
