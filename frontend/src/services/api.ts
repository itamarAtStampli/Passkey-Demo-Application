const API_BASE = '/api';

interface ApiOptions extends RequestInit {
  body?: string;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Registration endpoints
export async function getRegistrationOptions(username: string) {
  return apiRequest('/auth/register/options', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function verifyRegistration(response: unknown) {
  return apiRequest<{ success: boolean; credentialId: string }>('/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
}

// Authentication endpoints
export async function getLoginOptions(username?: string) {
  return apiRequest('/auth/login/options', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function verifyLogin(response: unknown) {
  return apiRequest<{ success: boolean; username: string }>('/auth/login/verify', {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
}

// Session endpoints
export async function getSession() {
  return apiRequest<{ loggedIn: boolean; username?: string }>('/auth/session');
}

export async function logout() {
  return apiRequest<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

