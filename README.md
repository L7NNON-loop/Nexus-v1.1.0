# Nexus WhatsApp Bot (Baileys) — v1.1.360.187.12

Servidor avançado multi-sessão para WhatsApp com **Baileys**, foco em:
- Comandos organizados (PT por padrão)
- Menu bonito com imagem (Madara Uchiha)
- Multi-conexão (`/conectar`)
- Sessões persistentes
- API HTTP para Render: `/connect`, `/qr/:session`, `/code/:session`
- Compatível com Termux

## Recursos incluídos

- **Base completa de bot** estilo MD com categorias utilitárias, grupo, admin, idiomas e status.
- **Comandos-chave**:
  - `/menu`
  - `/ping`
  - `/relogio`
  - `/idioma pt|en|es`
  - `/conectar <nome>`
  - `/qr [sessao]`
  - `/code [sessao] <telefone>`
  - `/grupo abrir|fechar`
  - `/antilink on|off`
  - `/boasvindas on|off`
  - `/owner`
  - `/stats`
- **Resposta com efeito de progresso** no WhatsApp para tarefas longas.
- **Persistência de dados/sessões** em `sessions/` e `data/state.json`.

## Estrutura

```bash
src/
  bot/
    commands.js
    menu.js
    sessionManager.js
  store/
    dataStore.js
  web/
    server.js
  config.js
  index.js
render.yaml
.env.example
```

## Instalação local (Linux/Termux)

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs git
git clone <SEU_REPO>
cd Nexus-v1.1.0
cp .env.example .env
npm install
npm start
```

> No primeiro start, escaneie o QR no terminal ou gere código de pareamento via rota `/code`.

## Uso da API

### Status e código oficial
```http
GET /
```
Retorna status, sessões, `waNumber` oficial e `codeConnect` com validade (`expiresAt`).

### Inicializar sessão
```http
GET /connect?session=cliente123
```
ou
```http
POST /connect
{
  "session": "cliente123"
}
```

### Buscar QR da sessão
```http
GET /qr/cliente123
```
Retorna `qrRaw` e `qrImage` (base64).

### Gerar código de pareamento
```http
POST /code/cliente123
{
  "phone": "2588XXXXXXXX"
}
```

## Deploy no Render

1. Suba este projeto no GitHub.
2. No Render, use **Blueprint** apontando para `render.yaml`.
3. Defina variáveis sensíveis (se desejar) em *Environment*.
4. Deploy.

### Comandos do Render
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Comandos para atualizar no Render
Quando atualizar código no GitHub, o Render faz auto-deploy (se `autoDeploy=true`).
Se quiser forçar localmente antes do push:

```bash
git add .
git commit -m "update: melhorias Nexus"
git push origin <sua-branch>
```

No painel do Render:
- `Manual Deploy` → `Deploy latest commit`.

## Variáveis importantes
- `BOT_OWNER`: dono/admin do bot.
- `OFFICIAL_WA_NUMBER`: número oficial usado para gerar `codeConnect` no `/`.
- `CODE_TTL_SEC`: segundos de validade lógica do `codeConnect` exibido.

## Admin configurado
- WhatsApp ADM: `+258867983175`

## Observações
- O Baileys depende de mudanças da plataforma WhatsApp; mantenha dependências atualizadas.
- Para produção séria multi-tenant, recomenda-se banco (Postgres/Redis) + fila + criptografia de sessão.
