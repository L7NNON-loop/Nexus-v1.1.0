import express from 'express';
import QRCode from 'qrcode';

function connectPageHtml() {
  return `<!doctype html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nexus Connect</title>
  <style>
    body{font-family:Arial,sans-serif;background:#111;color:#fff;display:flex;justify-content:center;padding:24px}
    .card{width:100%;max-width:520px;background:#1d1d1d;border-radius:12px;padding:16px}
    input,button{width:100%;padding:12px;border-radius:8px;border:1px solid #444;margin-top:8px}
    button{background:#6d28d9;color:#fff;border:none;cursor:pointer}
    pre{background:#000;padding:12px;border-radius:8px;overflow:auto}
  </style>
</head>
<body>
  <div class="card">
    <h2>Conectar sessão no Nexus</h2>
    <label>Nome da sessão</label>
    <input id="session" value="principal" />
    <label>Número WhatsApp (ex: 2588XXXXXXXX)</label>
    <input id="phone" placeholder="2588XXXXXXXX" />
    <button id="btn">Gerar código de conexão</button>
    <p>Se o código for aceito no WhatsApp, a sessão fica guardada em <code>sessions/&lt;nome&gt;</code>.</p>
    <pre id="out">Aguardando...</pre>
  </div>
  <script>
    document.getElementById('btn').addEventListener('click', async () => {
      const session = document.getElementById('session').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const out = document.getElementById('out');
      out.textContent = 'Gerando código...';

      const res = await fetch('/connect/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, phone })
      });
      const data = await res.json();
      out.textContent = JSON.stringify(data, null, 2);
    });
  </script>
</body>
</html>`;
}

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
    const wantsJson = req.query?.json === '1';
    if (!wantsJson) {
      return res.status(200).send(connectPageHtml());
    }

    const session = String(req.query?.session || 'principal').toLowerCase();
    await sessionManager.startSession(session);
    return res.json({
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

  app.post('/connect/code', async (req, res) => {
    const session = String(req.body?.session || 'principal').toLowerCase();
    const phone = String(req.body?.phone || '').replace(/\D/g, '');

    if (!phone) {
      return res.status(400).json({ ok: false, message: 'Informe um número válido em phone.' });
    }

    await sessionManager.startSession(session);
    const result = await sessionManager.requestPairingCode(session, phone);

    return res.json({
      ok: true,
      session,
      phone,
      ...result,
      persistedAuthPath: `sessions/${session}`,
    });
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
    const result = await sessionManager.requestPairingCode(session, phone);
    return res.json({ ok: true, session, ...result });
  });

  return app;
}
