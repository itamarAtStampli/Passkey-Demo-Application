import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/passkey.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// User operations
export const createUser = db.prepare<[string, string]>(
  'INSERT INTO users (id, username) VALUES (?, ?)'
);

export const getUserById = db.prepare<[string]>(
  'SELECT * FROM users WHERE id = ?'
);

export const getUserByUsername = db.prepare<[string]>(
  'SELECT * FROM users WHERE username = ?'
);

// Credential operations
export const createCredential = db.prepare<[string, string, Buffer, number, string | null]>(
  'INSERT INTO credentials (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)'
);

export const getCredentialById = db.prepare<[string]>(
  'SELECT * FROM credentials WHERE id = ?'
);

export const getCredentialsByUserId = db.prepare<[string]>(
  'SELECT * FROM credentials WHERE user_id = ?'
);

export const getAllCredentials = db.prepare(
  'SELECT * FROM credentials'
);

export const updateCredentialCounter = db.prepare<[number, string]>(
  'UPDATE credentials SET counter = ? WHERE id = ?'
);

// Challenge operations
export const upsertChallenge = db.prepare<[string, string, string]>(
  `INSERT INTO challenges (user_id, challenge, expires_at) VALUES (?, ?, ?)
   ON CONFLICT(user_id) DO UPDATE SET challenge = excluded.challenge, expires_at = excluded.expires_at`
);

export const getChallenge = db.prepare<[string]>(
  'SELECT * FROM challenges WHERE user_id = ?'
);

export const deleteChallenge = db.prepare<[string]>(
  'DELETE FROM challenges WHERE user_id = ?'
);

export const deleteExpiredChallenges = db.prepare(
  "DELETE FROM challenges WHERE expires_at < datetime('now')"
);

// Cleanup expired challenges periodically
setInterval(() => {
  deleteExpiredChallenges.run();
}, 60000); // Every minute

export default db;

