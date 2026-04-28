# Nexus WhatsApp Bot (Baileys) — v1.1.360.187.12

Servidor avançado multi-sessão para WhatsApp com **Baileys**.

## Recursos incluídos
- Comandos organizados e menu com imagem.
- Multi-conexão com sessões persistidas em `sessions/<sessao>`.
- API HTTP para Render: `/`, `/connect`, `/connect/code`, `/qr/:session`, `/code/:session`.
- Compatível com Termux.

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

## Fluxo recomendado de conexão

1. Abra no navegador: `https://SEU-APP.onrender.com/connect`
2. Preencha:
   - nome da sessão
   - número WhatsApp
3. Clique em **Gerar código de conexão**.
4. Digite o código no WhatsApp.
5. Ao conectar, a sessão fica salva em `sessions/<sessao>`.

## Uso da API

### Status e código oficial
```http
GET /
```
Retorna `waNumber`, `codeConnect` com `expiresAt` e sessões.

### Tela de conexão
```http
GET /connect
```
Abre interface HTML para gerar código.

### Iniciar sessão via JSON
```http
GET /connect?json=1&session=cliente123
```
ou
```http
POST /connect
{
  "session": "cliente123"
}
```

### Gerar código via endpoint dedicado
```http
POST /connect/code
{
  "session": "cliente123",
  "phone": "2588XXXXXXXX"
}
```

### Buscar QR da sessão
```http
GET /qr/cliente123
```

### Gerar código por sessão
```http
POST /code/cliente123
{
  "phone": "2588XXXXXXXX"
}
```

## Deploy no Render
1. Suba projeto no GitHub.
2. No Render use **Blueprint** com `render.yaml`.
3. Configure variáveis de ambiente.
4. Deploy.

### Comandos Render
- Build: `npm install`
- Start: `npm start`

### Atualizar Render
```bash
git add .
git commit -m "update: melhorias Nexus"
git push origin <sua-branch>
```
No Render: `Manual Deploy` → `Deploy latest commit`.

## Variáveis importantes
- `BOT_OWNER`: dono/admin.
- `OFFICIAL_WA_NUMBER`: número oficial para `codeConnect`.
- `CODE_TTL_SEC`: validade lógica (segundos) do code.

## Admin configurado
- `+258867983175`
