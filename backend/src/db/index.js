require('dotenv').config();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../cognia.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

// sql.js uses a WASM binary — we need to save to disk manually for persistence
let SQL = null;

async function initDb() {
  if (db) return db;

  const sqlJsPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  SQL = await require('sql.js')({ locateFile: () => sqlJsPath });

  // Load existing DB file if it exists
  let fileBuffer = null;
  if (fs.existsSync(DB_PATH)) {
    fileBuffer = fs.readFileSync(DB_PATH);
  }

  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.run(schema);

  // Auto-save to disk on process exit
  function saveDb() {
    try {
      const data = db.export();
      const buf = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buf);
    } catch (e) {
      console.error('DB save error:', e.message);
    }
  }

  // Save every 10 seconds and on exit
  setInterval(saveDb, 10000);
  process.on('exit', saveDb);
  process.on('SIGINT', () => { saveDb(); process.exit(); });
  process.on('SIGTERM', () => { saveDb(); process.exit(); });

  console.log('✅ Database ready (sql.js) at', DB_PATH);
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

/**
 * sql.js helper: run a SELECT and return all rows as objects
 */
function queryAll(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * sql.js helper: run a SELECT and return first row as object
 */
function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] ?? null;
}

/**
 * sql.js helper: run INSERT/UPDATE/DELETE, returns { lastInsertRowid, changes }
 */
function execute(sql, params = []) {
  getDb().run(sql, params);
  return {
    lastInsertRowid: getDb().exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0] ?? null,
    changes: getDb().getRowsModified(),
  };
}

module.exports = { initDb, getDb, queryAll, queryOne, execute };
