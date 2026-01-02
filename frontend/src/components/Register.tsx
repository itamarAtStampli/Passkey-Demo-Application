import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePasskey } from '../hooks/usePasskey';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';

interface RegisterProps {
  onRegisterSuccess: (username: string) => void;
}

export function Register({ onRegisterSuccess }: RegisterProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleSuccess = useCallback((registeredUsername: string) => {
    onRegisterSuccess(registeredUsername);
    navigate('/dashboard');
  }, [onRegisterSuccess, navigate]);

  const { isLoading, error, register } = usePasskey(handleSuccess);

  const validateUsername = (value: string): boolean => {
    if (!value.trim()) {
      setUsernameError('Username is required');
      return false;
    }
    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
      return false;
    }
    setUsernameError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUsername(username)) {
      return;
    }

    if (!browserSupportsWebAuthn()) {
      setUsernameError('Your browser does not support passkeys. Please use a modern browser.');
      return;
    }

    await register(username);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (usernameError) {
      validateUsername(value);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon register-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1>Create Account</h1>
          <p>Register with a passkey - no password needed!</p>
        </div>

        {(error || usernameError) && (
          <div className="error-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {usernameError || error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Choose a username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter a unique username"
              autoComplete="username"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Creating Passkey...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <circle cx="12" cy="16" r="1" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Create Passkey
              </>
            )}
          </button>
        </form>

        <div className="info-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <strong>What's a passkey?</strong>
            <p>
              A passkey uses your device's biometric (Face ID, Touch ID, or Windows Hello) 
              or PIN to securely authenticate you. No password to remember!
            </p>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

