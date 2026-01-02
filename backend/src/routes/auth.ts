import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import {
  createUser,
  getUserByUsername,
  getUserById,
  createCredential,
  getCredentialById,
  getCredentialsByUserId,
  getAllCredentials,
  updateCredentialCounter,
  upsertChallenge,
  getChallenge,
  deleteChallenge,
} from '../db';
import {
  generateRegOptions,
  verifyRegResponse,
  generateAuthOptions,
  verifyAuthResponse,
} from '../services/webauthn';
import { rpConfig } from '../config';
import type { User, Credential, Challenge, StoredCredential } from '../types';

const router = Router();

// Helper to convert DB credential to StoredCredential format
function toStoredCredential(cred: Credential): StoredCredential {
  return {
    credentialID: cred.id,
    credentialPublicKey: new Uint8Array(cred.public_key),
    counter: cred.counter,
    transports: cred.transports
      ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
      : undefined,
  };
}

// ==================== REGISTRATION ====================

/**
 * POST /api/auth/register/options
 * Generate registration options for a new user
 */
router.post('/register/options', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if user already exists
    const existingUser = getUserByUsername.get(username) as User | undefined;
    
    let userId: string;
    let existingCredentials: StoredCredential[] = [];

    if (existingUser) {
      // User exists - allow them to add another passkey
      userId = existingUser.id;
      const creds = getCredentialsByUserId.all(userId) as Credential[];
      existingCredentials = creds.map(toStoredCredential);
    } else {
      // New user - create user ID
      userId = uuidv4();
    }

    const options = await generateRegOptions(userId, username, existingCredentials);

    // Store the challenge for verification
    const expiresAt = new Date(Date.now() + rpConfig.challengeTimeout).toISOString();
    upsertChallenge.run(userId, options.challenge, expiresAt);

    // Store userId temporarily in session for verification step
    req.session.userId = userId;
    req.session.username = username;

    res.json(options);
  } catch (error) {
    console.error('Registration options error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

/**
 * POST /api/auth/register/verify
 * Verify registration response and store credential
 */
router.post('/register/verify', async (req: Request, res: Response) => {
  try {
    const { response } = req.body;
    const userId = req.session.userId;
    const username = req.session.username;

    if (!userId || !username) {
      return res.status(400).json({ error: 'No registration in progress' });
    }

    // Get the stored challenge
    const challengeRecord = getChallenge.get(userId) as Challenge | undefined;
    if (!challengeRecord) {
      return res.status(400).json({ error: 'Challenge not found or expired' });
    }

    // Check if challenge has expired
    if (new Date(challengeRecord.expires_at) < new Date()) {
      deleteChallenge.run(userId);
      return res.status(400).json({ error: 'Challenge expired' });
    }

    // Verify the registration response
    const verification = await verifyRegResponse(response, challengeRecord.challenge);

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { 
      credentialID, 
      credentialPublicKey, 
      counter,
      credentialDeviceType, 
      credentialBackedUp 
    } = verification.registrationInfo;

    // Check if user exists, create if not
    const existingUser = getUserById.get(userId) as User | undefined;
    if (!existingUser) {
      createUser.run(userId, username);
    }

    // Store the credential
    const transports = response.response.transports
      ? JSON.stringify(response.response.transports)
      : null;

    createCredential.run(
      credentialID,
      userId,
      Buffer.from(credentialPublicKey),
      counter,
      transports
    );

    // Clean up challenge
    deleteChallenge.run(userId);

    // Set session as logged in
    req.session.loggedIn = true;

    res.json({
      success: true,
      credentialId: credentialID,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    });
  } catch (error) {
    console.error('Registration verification error:', error);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

// ==================== AUTHENTICATION ====================

/**
 * POST /api/auth/login/options
 * Generate authentication options
 */
router.post('/login/options', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    
    let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;
    let userId: string;

    if (username) {
      // Explicit login with username
      const user = getUserByUsername.get(username) as User | undefined;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      userId = user.id;
      
      const credentials = getCredentialsByUserId.all(userId) as Credential[];
      if (credentials.length === 0) {
        return res.status(404).json({ error: 'No passkeys registered for this user' });
      }

      allowCredentials = credentials.map((cred) => ({
        id: cred.id,
        transports: cred.transports
          ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
          : undefined,
      }));
    } else {
      // Conditional UI / Passkey autofill - don't specify allowCredentials
      // Use a temporary user ID for challenge storage
      userId = 'conditional-' + uuidv4();
      allowCredentials = undefined;
    }

    const options = await generateAuthOptions(allowCredentials);

    // Store challenge
    const expiresAt = new Date(Date.now() + rpConfig.challengeTimeout).toISOString();
    upsertChallenge.run(userId, options.challenge, expiresAt);

    // Store userId in session for verification
    req.session.userId = userId;

    res.json(options);
  } catch (error) {
    console.error('Login options error:', error);
    res.status(500).json({ error: 'Failed to generate login options' });
  }
});

/**
 * POST /api/auth/login/verify
 * Verify authentication response
 */
router.post('/login/verify', async (req: Request, res: Response) => {
  try {
    const { response } = req.body;
    let userId = req.session.userId;

    if (!userId) {
      return res.status(400).json({ error: 'No login in progress' });
    }

    // Find the credential that was used
    const credentialId = response.id;
    const credentialRecord = getCredentialById.get(credentialId) as Credential | undefined;

    if (!credentialRecord) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    // For conditional UI, we need to look up the challenge differently
    let challengeRecord: Challenge | undefined;
    
    if (userId.startsWith('conditional-')) {
      // For conditional UI, find challenge by the temporary ID
      challengeRecord = getChallenge.get(userId) as Challenge | undefined;
    } else {
      challengeRecord = getChallenge.get(userId) as Challenge | undefined;
    }

    if (!challengeRecord) {
      return res.status(400).json({ error: 'Challenge not found or expired' });
    }

    // Check if challenge has expired
    if (new Date(challengeRecord.expires_at) < new Date()) {
      deleteChallenge.run(userId);
      return res.status(400).json({ error: 'Challenge expired' });
    }

    // Get the stored credential in the right format
    const storedCredential = toStoredCredential(credentialRecord);

    // Verify the authentication response
    const verification = await verifyAuthResponse(
      response,
      challengeRecord.challenge,
      storedCredential
    );

    if (!verification.verified) {
      return res.status(400).json({ error: 'Authentication failed' });
    }

    // Update the sign count to prevent replay attacks
    const newCounter = verification.authenticationInfo.newCounter;
    updateCredentialCounter.run(newCounter, credentialId);

    // Clean up challenge
    deleteChallenge.run(userId);

    // Get the actual user
    const actualUserId = credentialRecord.user_id;
    const user = getUserById.get(actualUserId) as User;

    // Set session as logged in
    req.session.userId = actualUserId;
    req.session.username = user.username;
    req.session.loggedIn = true;

    res.json({
      success: true,
      username: user.username,
    });
  } catch (error) {
    console.error('Login verification error:', error);
    res.status(500).json({ error: 'Failed to verify login' });
  }
});

// ==================== SESSION ====================

/**
 * GET /api/auth/session
 * Check current session status
 */
router.get('/session', (req: Request, res: Response) => {
  if (req.session.loggedIn) {
    res.json({
      loggedIn: true,
      username: req.session.username,
    });
  } else {
    res.json({ loggedIn: false });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

export default router;

