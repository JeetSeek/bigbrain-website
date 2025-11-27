import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pkg from 'pg'
const { Client } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load server/.env explicitly
dotenv.config({ path: path.join(__dirname, '..', '.env') })

function getConnectionConfig() {
  const url = process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.SUPABASE_DB_URL
    || process.env.SUPABASE_DB_URL_POOLER
    || process.env.SUPABASE_DB_URL_NON_POOLER
    || process.env.SUPABASE_DB_CONNECTION
    || process.env.SUPABASE_DB_CONNECTION_STRING
  if (url) return { connectionString: url, ssl: { rejectUnauthorized: false } }
  const host = process.env.PGHOST || process.env.SUPABASE_DB_HOST
  const port = process.env.PGPORT ? parseInt(process.env.PGPORT) : (process.env.SUPABASE_DB_PORT ? parseInt(process.env.SUPABASE_DB_PORT) : 5432)
  const user = process.env.PGUSER || process.env.SUPABASE_DB_USER
  const password = process.env.PGPASSWORD || process.env.SUPABASE_DB_PASSWORD
  const database = process.env.PGDATABASE || process.env.SUPABASE_DB_NAME
  if (host && user && database) return { host, port, user, password, database, ssl: { rejectUnauthorized: false } }
  throw new Error('Missing Postgres connection env. Provide DATABASE_URL or PGHOST/PGUSER/PGDATABASE/PGPASSWORD in server/.env')
}

async function run() {
  const relPath = process.argv[2] || 'migrations/001_create_knowledge_chunks.sql'
  const sqlPath = path.isAbsolute(relPath) ? relPath : path.join(__dirname, '..', relPath)
  if (!fs.existsSync(sqlPath)) throw new Error(`SQL file not found: ${sqlPath}`)
  const sql = fs.readFileSync(sqlPath, 'utf8')
  if (!sql.trim()) throw new Error('SQL file is empty')

  const cfg = getConnectionConfig()
  const client = new Client(cfg)
  console.log(`[migrate] Connecting to Postgres...`)
  await client.connect()
  try {
    console.log(`[migrate] Executing SQL from ${sqlPath}`)
    await client.query('begin')
    await client.query(sql)
    await client.query('commit')
    console.log(`[migrate] Success`) 
  } catch (e) {
    try { await client.query('rollback') } catch {}
    console.error(`[migrate] Failed: ${e.message}`)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
