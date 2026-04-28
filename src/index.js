import { config } from './config.js';
import { createSessionManager } from './bot/sessionManager.js';
import { dataStore } from './store/dataStore.js';
import { createHttpServer } from './web/server.js';

async function bootstrap() {
  const sessionManager = createSessionManager({ config, dataStore });
  await sessionManager.startSession('principal');

  if (config.preferredPairingPhone) {
    const code = await sessionManager.requestPairingCode('principal', config.preferredPairingPhone);
    console.log(`Pairing code principal: ${code}`);
  }

  const app = createHttpServer({ config, sessionManager });
  app.listen(config.port, () => {
    console.log(`✅ Nexus ${config.version} online em http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar Nexus:', error);
  process.exit(1);
});
