import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { login, register, type AuthCredentials } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { StatusDot } from '../../components/ui/StatusDot';
import { TextField } from '../../components/ui/TextField';
import { BrandLogo } from '../../components/ui/BrandLogo';

interface AuthGatewayProps {
  worldOnline: boolean;
  onAuthenticated: () => Promise<void>;
}

function getErrorMessage(error: unknown): string | null {
  const responseMessage = (error as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
  if (!responseMessage) return null;
  return Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;
}

export function AuthGateway({ worldOnline, onAuthenticated }: AuthGatewayProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [credentials, setCredentials] = useState<AuthCredentials>({ email: '', password: '' });

  const authMutation = useMutation({
    mutationFn: (payload: AuthCredentials) => mode === 'login' ? login(payload) : register(payload),
    onSuccess: async () => {
      setCredentials((current) => ({ ...current, password: '' }));
      await onAuthenticated();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    authMutation.mutate(credentials);
  }

  return (
    <main className="gateway-screen">
      <div className="gateway-backdrop" aria-hidden="true" />
      <div className="gateway-atmosphere" aria-hidden="true" />

      <section className="gateway-layout">
        <div className="gateway-story">
          <div className="gateway-hero-brand"><BrandLogo /></div>
          <div className="gateway-story-copy">
            <p className="gateway-story-eyebrow">U bram Czarnej Cytadeli</p>
            <h1>Twoja legenda<br />zaczyna się w mroku.</h1>
            <p>Przekrocz mosty Etherii, zdobądź własne imię i zapisz je pośród tych, których pamiętają kamienne kroniki.</p>
          </div>
        </div>

        <div className="gateway-form-column">
          <span className="gateway-panel-corner gateway-panel-corner-tl" aria-hidden="true" />
          <span className="gateway-panel-corner gateway-panel-corner-tr" aria-hidden="true" />
          <span className="gateway-panel-corner gateway-panel-corner-bl" aria-hidden="true" />
          <span className="gateway-panel-corner gateway-panel-corner-br" aria-hidden="true" />

          <div className="gateway-mobile-brand"><BrandLogo /></div>
          <div className="gateway-form-status">
            <span>Połączenie ze światem</span>
            <StatusDot label={worldOnline ? 'Połączono' : 'Brak połączenia'} online={worldOnline} />
          </div>

          <div className="gateway-form-heading">
            <p>Brama bohatera</p>
            <h2>{mode === 'login' ? 'Powrót do Etherii' : 'Nowa przysięga'}</h2>
          </div>
          <p className="gateway-form-description">
            {mode === 'login' ? 'Zaloguj się, aby kontynuować swoją opowieść.' : 'Utwórz konto i rozpocznij nową kronikę.'}
          </p>

          <form className="gateway-form" onSubmit={handleSubmit}>
            <TextField
              label="Adres e-mail"
              name="email"
              type="email"
              autoComplete="email"
              value={credentials.email}
              onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <TextField
              label="Hasło"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              error={getErrorMessage(authMutation.error)}
              required
            />
            <Button type="submit" fullWidth disabled={authMutation.isPending || !worldOnline}>
              {authMutation.isPending ? 'Proszę czekać…' : mode === 'login' ? 'Wejdź do świata' : 'Utwórz konto'}
            </Button>
          </form>

          <button
            type="button"
            className="gateway-mode-switch"
            onClick={() => {
              setMode((current) => current === 'login' ? 'register' : 'login');
              authMutation.reset();
            }}
          >
            {mode === 'login' ? 'Nie masz konta? Złóż nową przysięgę' : 'Masz już konto? Wróć do logowania'}
          </button>
        </div>
      </section>
    </main>
  );
}
