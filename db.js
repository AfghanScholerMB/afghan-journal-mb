const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// ✅ Ensure the data directory exists on Render before opening SQLite
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite DB path
const dbPath = path.join(dataDir, "app.db");
const db = new Database(dbPath);

// Performance + safety
db.pragma("journal_mode = WAL");

// Create tables if not exist
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  year INTEGER,
  category TEXT NOT NULL,
  document_type TEXT NOT NULL,
  abstract TEXT,
  keywords TEXT,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(uploaded_by) REFERENCES users(id)
);
`);

module.exports = db;