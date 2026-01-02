# Passkey Demo Application

A full-stack demo application showcasing **passkey-only authentication** using WebAuthn. No passwords required!

## Features

- **Passkey Registration**: Create accounts using biometric authentication (Face ID, Touch ID, Windows Hello)
- **Passkey Authentication**: Sign in securely with your device's built-in authentication
- **Conditional UI (Passkey Autofill)**: Passkeys appear in the browser's autofill dropdown
- **Phishing Resistant**: Cryptographic binding to the domain prevents credential theft
- **No Shared Secrets**: Only public keys are stored on the server

## Tech Stack

### Backend
- **Express.js** with TypeScript
- **SimpleWebAuthn** for WebAuthn server-side logic
- **SQLite** (better-sqlite3) for data persistence
- **express-session** for session management

### Frontend
- **React 18** with TypeScript (Create React App)
- **SimpleWebAuthn Browser** for WebAuthn client-side logic
- **React Router** for navigation

## Project Structure

```
passkey-demo/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express app entry
│   │   ├── config.ts         # RP configuration
│   │   ├── db/
│   │   │   ├── index.ts      # SQLite setup
│   │   │   └── schema.sql    # Database schema
│   │   ├── routes/
│   │   │   └── auth.ts       # WebAuthn endpoints
│   │   ├── services/
│   │   │   └── webauthn.ts   # SimpleWebAuthn wrapper
│   │   └── types/
│   │       └── index.ts      # TypeScript interfaces
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── components/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/
│   │   │   └── usePasskey.ts
│   │   └── services/
│   │       └── api.ts
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- A browser that supports WebAuthn (Chrome, Safari, Firefox, Edge)

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Start the Backend Server

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:4000`

### 4. Start the Frontend Development Server

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

### 5. Open in Browser

Navigate to `http://localhost:3000` and:
1. Click "Create one" to register a new account
2. Enter a username and create your passkey
3. Your device will prompt for biometric authentication
4. After registration, you're logged in!
5. Log out and try signing in with your passkey

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/options` | Get registration challenge |
| POST | `/api/auth/register/verify` | Verify and store credential |
| POST | `/api/auth/login/options` | Get authentication challenge |
| POST | `/api/auth/login/verify` | Verify assertion |
| GET | `/api/auth/session` | Check session status |
| POST | `/api/auth/logout` | End session |

## Security Considerations

1. **RP ID Scoping**: The Relying Party ID is set to `localhost` for development. In production, set it to your exact domain.

2. **Challenge Expiration**: Challenges expire after 60 seconds to prevent replay attacks.

3. **Sign Count Validation**: The server tracks and validates credential counters to detect cloned authenticators.

4. **Session Security**:
   - `httpOnly: true` prevents XSS access to cookies
   - `secure: true` (production) ensures HTTPS-only
   - `sameSite: 'strict'` provides CSRF protection

5. **No Password Storage**: Only public keys are stored—nothing to leak!

## How It Works

### The WebAuthn "Ceremony"

```
Registration:
1. Server generates a random challenge
2. Browser calls navigator.credentials.create()
3. User authenticates with biometric/PIN
4. Device creates a key pair (private stays on device)
5. Public key + attestation sent to server
6. Server verifies and stores the public key

Authentication:
1. Server generates a random challenge
2. Browser calls navigator.credentials.get()
3. User authenticates with biometric/PIN
4. Device signs the challenge with private key
5. Signed assertion sent to server
6. Server verifies signature using stored public key
```

### Conditional UI (Autofill)

The login form uses `autocomplete="username webauthn"` which enables browsers to show passkeys in the autofill dropdown. This provides a seamless user experience where users can simply click on their passkey to authenticate.

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Server port |
| `RP_ID` | localhost | Relying Party ID (domain) |
| `ORIGIN` | http://localhost:3000 | Expected origin |
| `SESSION_SECRET` | (random) | Session encryption key |
| `NODE_ENV` | development | Environment mode |

## Troubleshooting

### "NotAllowedError" on registration
- Make sure you're accessing the app via `localhost` (not `127.0.0.1`)
- Ensure your browser supports WebAuthn
- Check that you have a platform authenticator available

### Passkey not appearing in autofill
- Conditional UI requires a supported browser (Chrome 108+, Safari 16+)
- Make sure the input has `autocomplete="username webauthn"`
- The passkey must have been created as a "discoverable credential"

### "Challenge expired" error
- The default challenge timeout is 60 seconds
- Try the registration/authentication again

## License

MIT

