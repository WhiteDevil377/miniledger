import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const root = new URL('../', import.meta.url);
const apiEnv = new URL('apps/api/.env', root);
if (!existsSync(apiEnv)) {
  const template = readFileSync(new URL('apps/api/.env.example', root), 'utf8');
  writeFileSync(
    apiEnv,
    template.replace(
      'replace-with-a-random-secret-at-least-32-characters-long',
      randomBytes(32).toString('hex'),
    ),
  );
}
const appEnv = new URL('apps/mobile/.env', root);
if (!existsSync(appEnv))
  writeFileSync(appEnv, readFileSync(new URL('apps/mobile/.env.example', root), 'utf8'));
console.log(
  'Local environment files ready. For a physical phone, set EXPO_PUBLIC_API_URL to your computer’s LAN IP.',
);
