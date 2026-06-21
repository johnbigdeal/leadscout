const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.jkyscrdczwkxwiademgl:Test1234%21SecurePassword@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  const check = await client.query('SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1', ['0006_conscious_grandmaster']);
  if (check.rows.length === 0) {
    await client.query('INSERT INTO drizzle.__drizzle_migrations(hash, created_at) VALUES($1, extract(epoch from now())*1000)', ['0006_conscious_grandmaster']);
    console.log('Migration tracked');
  } else {
    console.log('Migration already tracked');
  }
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
