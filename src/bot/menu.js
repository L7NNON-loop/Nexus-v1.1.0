export function buildMenu({ botName, version, lang, timezone, owner }) {
  return `╔══════════════════════╗
║ 🤖 *${botName}* v${version}
║ 🌐 Idioma: *${lang.toUpperCase()}*
║ 🕒 Timezone: *${timezone}*
║ 👑 Admin: wa.me/${owner}
╠══════════════════════╣
║ */menu* - abrir este menu
║ */ping* - status em ms
║ */relogio* - hora atual
║ */idioma pt|en|es* - trocar idioma
║ */conectar <nome>* - cria sessão
║ */qr [sessao]* - receber QR no chat
║ */code [sessao] <telefone>* - pairing code
║ */grupo abrir|fechar* - controle do grupo
║ */antilink on|off* - proteção grupo
║ */boasvindas on|off* - mensagem automática
║ */owner* - contato do administrador
║ */stats* - dados e uso
╠══════════════════════╣
║ Recursos: multi-sessão, API /qr e /code,
║ Render ready, Termux friendly, persistência.
╚══════════════════════╝`;
}
