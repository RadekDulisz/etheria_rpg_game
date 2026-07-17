import type { SessionUser } from '../types/game';
import { httpClient } from './http';

export interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthResult {
  status: 'ok' | 'error';
}

export async function getSession(): Promise<SessionUser | null> {
  const response = await httpClient.get<SessionUser | null>('/auth/session');
  return response.data;
}

export async function login(credentials: AuthCredentials): Promise<AuthResult> {
  const response = await httpClient.post<AuthResult>('/auth/login', credentials);
  return response.data;
}

export async function register(credentials: AuthCredentials): Promise<AuthResult> {
  const response = await httpClient.post<AuthResult>('/auth/register', credentials);
  return response.data;
}

export async function refreshSession(): Promise<AuthResult> {
  const response = await httpClient.post<AuthResult>('/auth/refresh');
  return response.data;
}

export async function logout(): Promise<AuthResult> {
  const response = await httpClient.post<AuthResult>('/auth/logout');
  return response.data;
}

