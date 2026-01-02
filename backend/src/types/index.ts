import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface Credential {
  id: string;
  user_id: string;
  public_key: Buffer;
  counter: number;
  transports: string | null;
  created_at: string;
}

export interface Challenge {
  user_id: string;
  challenge: string;
  expires_at: string;
}

// Extend express-session to include our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
    loggedIn?: boolean;
  }
}

export interface StoredCredential {
  credentialID: string;
  credentialPublicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
}

