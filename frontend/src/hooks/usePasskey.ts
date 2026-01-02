import { useState, useCallback, useRef, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import * as api from '../services/api';

interface UsePasskeyReturn {
  isLoading: boolean;
  error: string | null;
  register: (username: string) => Promise<boolean>;
  login: (username?: string) => Promise<boolean>;
  startConditionalUI: () => Promise<void>;
  cancelConditionalUI: () => void;
}

export function usePasskey(onSuccess?: (username: string) => void): UsePasskeyReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const register = useCallback(async (username: string): Promise<boolean> => {
    clearError();
    setIsLoading(true);

    try {
      // Get registration options from server
      const options = await api.getRegistrationOptions(username) as PublicKeyCredentialCreationOptionsJSON;

      // Start the registration ceremony
      const credential = await startRegistration({ optionsJSON: options });

      // Verify with server
      const result = await api.verifyRegistration(credential);

      if (result.success) {
        onSuccess?.(username);
        return true;
      }

      setError('Registration verification failed');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      
      // Handle user cancellation gracefully
      if (message.includes('cancelled') || message.includes('NotAllowedError')) {
        setError('Registration was cancelled');
      } else {
        setError(message);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, clearError]);

  const login = useCallback(async (username?: string): Promise<boolean> => {
    clearError();
    setIsLoading(true);

    // Cancel any existing conditional UI
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      // Get authentication options from server
      const options = await api.getLoginOptions(username) as PublicKeyCredentialRequestOptionsJSON;

      // Start the authentication ceremony
      const credential = await startAuthentication({
        optionsJSON: options,
      });

      // Verify with server
      const result = await api.verifyLogin(credential);

      if (result.success) {
        onSuccess?.(result.username);
        return true;
      }

      setError('Login verification failed');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      
      // Handle user cancellation gracefully
      if (message.includes('cancelled') || message.includes('NotAllowedError')) {
        setError('Login was cancelled');
      } else {
        setError(message);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, clearError]);

  const startConditionalUI = useCallback(async (): Promise<void> => {
    // Cancel any existing conditional UI
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      // Get authentication options for conditional UI (no username)
      const options = await api.getLoginOptions() as PublicKeyCredentialRequestOptionsJSON;

      // Start conditional UI authentication
      const credential = await startAuthentication({
        optionsJSON: options,
        useBrowserAutofill: true,
      });

      // Verify with server
      const result = await api.verifyLogin(credential);

      if (result.success) {
        onSuccess?.(result.username);
      }
    } catch (err) {
      // Ignore AbortError - it's expected when component unmounts or user navigates
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const message = err instanceof Error ? err.message : 'Authentication failed';
      
      // Don't show error for user cancellation in conditional UI
      if (!message.includes('cancelled') && !message.includes('NotAllowedError')) {
        console.error('Conditional UI error:', message);
      }
    }
  }, [onSuccess]);

  const cancelConditionalUI = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return {
    isLoading,
    error,
    register,
    login,
    startConditionalUI,
    cancelConditionalUI,
  };
}

