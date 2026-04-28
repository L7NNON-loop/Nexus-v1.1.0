import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  botName: process.env.BOT_NAME || 'Nexus',
  version: process.env.BOT_VERSION || '1.1.360.187.12',
  owner: (process.env.BOT_OWNER || '258867983175').replace(/\D/g, ''),
  officialWaNumber: (process.env.OFFICIAL_WA_NUMBER || process.env.BOT_OWNER || '258867983175').replace(/\D/g, ''),
  defaultLang: process.env.DEFAULT_LANG || 'pt',
  timezone: process.env.TIMEZONE || 'Africa/Maputo',
  menuImageUrl:
    process.env.MENU_IMAGE_URL ||
    'https://images6.alphacoders.com/133/1336715.jpeg',
  preferredPairingPhone: (process.env.PREFERRED_PAIRING_PHONE || '').replace(/\D/g, ''),
  codeTtlSec: Number(process.env.CODE_TTL_SEC || 60),
};
