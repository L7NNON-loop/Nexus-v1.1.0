import moment from 'moment-timezone';
import { buildMenu } from './menu.js';

const languagePack = {
  pt: {
    connected: '✅ Sessão conectada com sucesso!',
    progress: '⏳ Processando...',
    changed: '🌐 Idioma alterado para Português.',
  },
  en: {
    connected: '✅ Session connected successfully!',
    progress: '⏳ Processing...',
    changed: '🌐 Language set to English.',
  },
  es: {
    connected: '✅ Sesión conectada correctamente.',
    progress: '⏳ Procesando...',
    changed: '🌐 Idioma cambiado a Español.',
  },
};

function normalizeText(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    ''
  );
}

export async function runCommand(ctx) {
  const {
    config,
    sock,
    msg,
    sessionName,
    dataStore,
    sessionManager,
    lastQrMap,
  } = ctx;
  const text = normalizeText(msg.message);
  if (!text.startsWith('/')) return;

  const [rawCommand, ...args] = text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase();
  const remoteJid = msg.key.remoteJid;
  const sender = (msg.key.participant || remoteJid || '').replace(/\D/g, '');

  const state = dataStore.getState();
  const user = state.users[sender] || { lang: config.defaultLang };
  const lang = user.lang || config.defaultLang;
  const pack = languagePack[lang] || languagePack.pt;

  async function progressReply(title = pack.progress) {
    const steps = [
      `${title}\n[▓░░░░░░░░░] 10%`,
      `${title}\n[▓▓▓▓░░░░░░] 40%`,
      `${title}\n[▓▓▓▓▓▓▓░░░] 75%`,
      `${title}\n[▓▓▓▓▓▓▓▓▓▓] 100%`,
    ];
    for (const step of steps) {
      await sock.sendMessage(remoteJid, { text: step }, { quoted: msg });
    }
  }

  switch (command) {
    case '/menu': {
      const menuText = buildMenu({
        botName: config.botName,
        version: config.version,
        lang,
        timezone: config.timezone,
        owner: config.owner,
      });
      await sock.sendMessage(remoteJid, {
        image: { url: config.menuImageUrl },
        caption: menuText,
      });
      break;
    }

    case '/ping': {
      const start = Date.now();
      await sock.sendMessage(remoteJid, { text: '🏓 Pong...' }, { quoted: msg });
      const latency = Date.now() - start;
      await sock.sendMessage(remoteJid, {
        text: `⚡ Latência: *${latency}ms*\nSessão: *${sessionName}*`,
      });
      break;
    }

    case '/relogio': {
      const now = moment().tz(config.timezone).format('DD/MM/YYYY HH:mm:ss');
      await sock.sendMessage(remoteJid, { text: `🕒 Horário atual (${config.timezone}): ${now}` });
      break;
    }

    case '/idioma': {
      const nextLang = (args[0] || '').toLowerCase();
      if (!languagePack[nextLang]) {
        await sock.sendMessage(remoteJid, { text: 'Use: /idioma pt|en|es' });
        break;
      }
      dataStore.update((s) => {
        s.users[sender] = { ...(s.users[sender] || {}), lang: nextLang };
        return s;
      });
      await sock.sendMessage(remoteJid, { text: languagePack[nextLang].changed });
      break;
    }

    case '/owner': {
      await sock.sendMessage(remoteJid, {
        text: `👑 Dono do bot: wa.me/${config.owner}`,
      });
      break;
    }

    case '/stats': {
      const snapshot = dataStore.getState();
      await sock.sendMessage(remoteJid, {
        text: `📊 Stats Nexus\nUsuários: ${Object.keys(snapshot.users).length}\nGrupos: ${Object.keys(snapshot.groups).length}\nSessões: ${Object.keys(snapshot.sessions).length}`,
      });
      break;
    }

    case '/conectar': {
      const targetSession = (args[0] || `user-${sender}`).toLowerCase();
      await progressReply('🔌 Criando sessão...');
      await sessionManager.startSession(targetSession);
      await sock.sendMessage(remoteJid, {
        text: `${pack.connected}\nSessão: *${targetSession}*\nAbra: /qr ${targetSession} ou /code ${targetSession} <telefone>`
      });
      break;
    }

    case '/qr': {
      const targetSession = (args[0] || sessionName).toLowerCase();
      const qr = lastQrMap.get(targetSession);
      if (!qr) {
        await sock.sendMessage(remoteJid, { text: 'Sem QR disponível agora. Gere com /conectar.' });
        break;
      }
      await sock.sendMessage(remoteJid, { text: `📲 QR da sessão ${targetSession}:\n${qr}` });
      break;
    }

    case '/code': {
      const targetSession = (args[0] || sessionName).toLowerCase();
      const phone = (args[1] || '').replace(/\D/g, '');
      if (!phone) {
        await sock.sendMessage(remoteJid, { text: 'Use: /code <sessao> <telefone>' });
        break;
      }
      const code = await sessionManager.requestPairingCode(targetSession, phone);
      await sock.sendMessage(remoteJid, { text: `🔐 Pairing code (${targetSession}): *${code}*` });
      break;
    }

    case '/grupo': {
      if (!remoteJid.endsWith('@g.us')) {
        await sock.sendMessage(remoteJid, { text: 'Comando só para grupos.' });
        break;
      }
      const action = (args[0] || '').toLowerCase();
      if (!['abrir', 'fechar'].includes(action)) {
        await sock.sendMessage(remoteJid, { text: 'Use: /grupo abrir|fechar' });
        break;
      }
      await sock.groupSettingUpdate(remoteJid, action === 'abrir' ? 'not_announcement' : 'announcement');
      await sock.sendMessage(remoteJid, { text: `✅ Grupo ${action === 'abrir' ? 'aberto' : 'fechado'}.` });
      break;
    }

    case '/antilink':
    case '/boasvindas': {
      if (!remoteJid.endsWith('@g.us')) {
        await sock.sendMessage(remoteJid, { text: 'Comando só para grupos.' });
        break;
      }
      const option = (args[0] || '').toLowerCase();
      if (!['on', 'off'].includes(option)) {
        await sock.sendMessage(remoteJid, { text: `Use: ${command} on|off` });
        break;
      }
      dataStore.update((s) => {
        const group = s.groups[remoteJid] || {};
        group[command.slice(1)] = option === 'on';
        s.groups[remoteJid] = group;
        return s;
      });
      await sock.sendMessage(remoteJid, { text: `✅ ${command} ${option}` });
      break;
    }

    default:
      break;
  }
}
