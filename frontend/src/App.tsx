import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import * as api from './services/api';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string>('');

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const session = await api.getSession();
        setIsLoggedIn(session.loggedIn);
        if (session.loggedIn && session.username) {
          setUsername(session.username);
        }
      } catch {
        setIsLoggedIn(false);
      }
    }

    checkSession();
  }, []);

  const handleLoginSuccess = useCallback((loggedInUsername: string) => {
    setIsLoggedIn(true);
    setUsername(loggedInUsername);
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setUsername('');
  }, []);

  // Show loading while checking session
  if (isLoggedIn === null) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/register"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Register onRegisterSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <Dashboard username={username} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
