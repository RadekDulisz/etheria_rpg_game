import { AxiosError } from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Nie udało się wykonać operacji.'): string {
  const message = (error as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
  if (!message) return fallback;
  return Array.isArray(message) ? message.join(', ') : message;
}

