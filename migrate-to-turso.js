// One-off script: copies everything from your local karate.db into a Turso
// database, preserving IDs (so foreign keys between students/attendance/
// events stay correct). Safe to re-run - uses INSERT OR REPLACE.
//
// Usage:
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node migrate-to-turso.js
const path = require('node:path');
const { createDatabase } = require('./db.js');

async function copyTable(source, dest, tableName) {
  const result = await source.rawClient.execute(`SELECT * FROM ${tableName}`);
  if (result.rows.length === 0) {
    console.log(`  ${tableName}: 0 rows (nothing to copy)`);
    return 0;
  }
  const columns = result.columns;
  const placeholders = columns.map(() => '?').join(', ');
  const insertSql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  for (const row of result.rows) {
    const args = columns.map((_, i) => row[i]);
    await dest.rawClient.execute({ sql: insertSql, args });
  }
  console.log(`  ${tableName}: copied ${result.rows.length} row(s)`);
  return result.rows.length;
}

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (!tursoUrl || !tursoToken) {
    console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables before running this.');
    process.exit(1);
  }

  const localDbPath = path.join(__dirname, 'karate.db');
  console.log(`Source (local):      ${localDbPath}`);
  console.log(`Destination (Turso): ${tursoUrl}`);

  const source = await createDatabase(localDbPath);
  const dest = await createDatabase(tursoUrl, tursoToken);

  console.log('\nCopying tables (in foreign-key-safe order)...');
  await copyTable(source, dest, 'students');
  await copyTable(source, dest, 'events');
  await copyTable(source, dest, 'attendance');
  await copyTable(source, dest, 'event_participants');
  await copyTable(source, dest, 'auth_config');

  console.log('\nDone - your Turso database now has a full copy of your local data.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
