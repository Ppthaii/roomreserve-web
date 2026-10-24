const { Client } = require('pg');

async function setup() {
  const adminClient = new Client({
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    port: Number(process.env.PGPORT || 5432),
    database: 'postgres'
  });

  await adminClient.connect();
  const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname='roomreserve_db'");
  if (res.rowCount === 0) {
    console.log('Creating database roomreserve_db...');
    await adminClient.query('CREATE DATABASE roomreserve_db');
    console.log('Database roomreserve_db created successfully.');
  } else {
    console.log('Database roomreserve_db already exists.');
  }
  await adminClient.end();
}

setup().catch(err => {
  console.error('Database setup error:', err);
  process.exit(1);
});
