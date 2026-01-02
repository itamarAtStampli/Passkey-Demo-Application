-- Users table (minimal, identifier only)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Credentials table (WebAuthn passkeys)
CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,              -- Base64URL encoded credential ID
    user_id TEXT NOT NULL,
    public_key BLOB NOT NULL,         -- COSE public key
    counter INTEGER DEFAULT 0,        -- Sign count for replay detection
    transports TEXT,                  -- JSON array of transports
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Challenges table (temporary, for verification)
CREATE TABLE IF NOT EXISTS challenges (
    user_id TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON challenges(expires_at);

