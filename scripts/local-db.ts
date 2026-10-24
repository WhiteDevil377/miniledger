import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const databaseDir = fileURLToPath(new URL('../.local/postgres', import.meta.url));
mkdirSync(databaseDir, { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'miniledger',
  password: 'miniledger',
  port: 5432,
  persistent: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
});
if (!existsSync(`${databaseDir}/PG_VERSION`)) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const exists = await client.query("SELECT 1 FROM pg_database WHERE datname='miniledger'");
if (!exists.rowCount) await client.query('CREATE DATABASE miniledger');
await client.end();
console.log('PostgreSQL ready at localhost:5432. Leave this terminal open. Ctrl+C stops it.');
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on('SIGINT', () => {
  void stop();
});
process.on('SIGTERM', () => {
  void stop();
});
setInterval(() => {}, 60_000);
