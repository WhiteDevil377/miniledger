import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

await pool.query('SELECT 1');
const server = createApp(pool).listen(config.PORT, '0.0.0.0', () => {
  console.log(`MiniLedger API ready at http://localhost:${config.PORT}`);
  console.log(`Mock OTPs appear below. Calendar time zone: ${config.APP_TIMEZONE}`);
});

function shutdown() {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
