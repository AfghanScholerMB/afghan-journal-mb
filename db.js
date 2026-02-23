
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "data", "app.db");
const db = new Database(dbPath);

// Create tables if not exist
db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'user',
	affiliation TEXT,
	country TEXT,
	is_banned INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE,
	slug TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL,
	authors TEXT NOT NULL,
	abstract TEXT NOT NULL,
	keywords TEXT NOT NULL,
	category_id INTEGER NOT NULL,
	document_type TEXT NOT NULL,
	year INTEGER,
	journal_or_conference TEXT,
	doi TEXT,
	language TEXT NOT NULL,
	pdf_path TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'PENDING',
	reject_reason TEXT,
	uploader_id INTEGER NOT NULL,
	views_count INTEGER NOT NULL DEFAULT 0,
	downloads_count INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY(category_id) REFERENCES categories(id),
	FOREIGN KEY(uploader_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
	user_id INTEGER NOT NULL,
	document_id INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (user_id, document_id),
	FOREIGN KEY(user_id) REFERENCES users(id),
	FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS contact_messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	message TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_docs_status_created ON documents(status, created_at);
CREATE INDEX IF NOT EXISTS idx_docs_category ON documents(category_id);
`);

module.exports = db;
