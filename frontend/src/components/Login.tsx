import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePasskey } from '../hooks/usePasskey';
import { browserSupportsWebAuthnAutofill } from '@simplewebauthn/browser';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [supportsAutofill, setSupportsAutofill] = useState(false);

  const handleSuccess = useCallback((loggedInUsername: string) => {
    onLoginSuccess(loggedInUsername);
    navigate('/dashboard');
  }, [onLoginSuccess, navigate]);

  const { isLoading, error, login, startConditionalUI, cancelConditionalUI } = usePasskey(handleSuccess);

  // Check for conditional UI support and start it
  useEffect(() => {
    let mounted = true;

    async function initConditionalUI() {
      const supported = await browserSupportsWebAuthnAutofill();
      if (mounted) {
        setSupportsAutofill(supported);
        if (supported) {
          startConditionalUI();
        }
      }
    }

    initConditionalUI();

    return () => {
      mounted = false;
      cancelConditionalUI();
    };
  }, [startConditionalUI, cancelConditionalUI]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    cancelConditionalUI();
    await login(username || undefined);
  };

  const handlePasskeyButton = async () => {
    cancelConditionalUI();
    await login();
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in with your passkey</p>
        </div>

        {error && (
          <div className="error-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username (optional)</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username webauthn"
              disabled={isLoading}
            />
            {supportsAutofill && (
              <span className="hint">
                Your passkey may appear in the autocomplete menu
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Authenticating...
              </>
            ) : (
              'Sign in with Username'
            )}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary passkey-btn"
          onClick={handlePasskeyButton}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <circle cx="12" cy="16" r="1" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Sign in with Passkey
        </button>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

