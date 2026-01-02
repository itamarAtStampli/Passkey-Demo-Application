import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { rpConfig } from '../config';
import type { StoredCredential } from '../types';

export async function generateRegOptions(
  userId: string,
  username: string,
  existingCredentials: StoredCredential[] = []
) {
  const options = await generateRegistrationOptions({
    rpName: rpConfig.rpName,
    rpID: rpConfig.rpID,
    userID: new TextEncoder().encode(userId),
    userName: username,
    userDisplayName: username,
    attestationType: 'none', // For demo purposes, we don't need attestation
    authenticatorSelection: {
      residentKey: 'required', // Required for discoverable credentials (passkeys)
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
    },
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialID,
      type: 'public-key',
      transports: cred.transports,
    })),
    timeout: rpConfig.challengeTimeout,
  });

  return options;
}

export async function verifyRegResponse(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpConfig.origin,
    expectedRPID: rpConfig.rpID,
    requireUserVerification: true,
  });

  return verification;
}

export async function generateAuthOptions(
  allowCredentials?: { id: string; transports?: AuthenticatorTransportFuture[] }[]
) {
  const options = await generateAuthenticationOptions({
    rpID: rpConfig.rpID,
    userVerification: 'preferred',
    allowCredentials: allowCredentials?.map((cred) => ({
      id: cred.id,
      type: 'public-key',
      transports: cred.transports,
    })),
    timeout: rpConfig.challengeTimeout,
  });

  return options;
}

export async function verifyAuthResponse(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: StoredCredential
): Promise<VerifiedAuthenticationResponse> {
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpConfig.origin,
    expectedRPID: rpConfig.rpID,
    authenticator: {
      credentialID: credential.credentialID,
      credentialPublicKey: credential.credentialPublicKey,
      counter: credential.counter,
      transports: credential.transports,
    },
    requireUserVerification: true,
  });

  return verification;
}

