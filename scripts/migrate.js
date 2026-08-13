const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const file of fs.readdirSync(path.join(__dirname, '..', 'migrations')).filter(f => f.endsWith('.sql')).sort()) {
      const version = file.replace(/\.sql$/, '');
      const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', file), 'utf8');
      const checksum = require('crypto').createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE version=$1', [version]);
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Migration checksum mismatch: ${version}`);
        continue;
      }
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version, checksum) VALUES ($1,$2)', [version, checksum]);
      await client.query('COMMIT');
      console.log(`Applied migration ${version}`);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => { console.error(error.message); process.exit(1); });
