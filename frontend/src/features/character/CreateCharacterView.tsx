import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { createCharacter } from '../../api/character.api';
import { Button } from '../../components/ui/Button';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { TextField } from '../../components/ui/TextField';

interface CreateCharacterViewProps {
  onCreated: () => Promise<void>;
}

export function CreateCharacterView({ onCreated }: CreateCharacterViewProps) {
  const [name, setName] = useState('');
  const mutation = useMutation({
    mutationFn: createCharacter,
    onSuccess: onCreated,
  });
  const message = (mutation.error as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
  const error = Array.isArray(message) ? message.join(', ') : message;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(name);
  }

  return (
    <main className="gateway-screen character-creation-screen">
      <div className="gateway-backdrop" aria-hidden="true" />
      <div className="character-creation-atmosphere" aria-hidden="true" />
      <div className="character-creation-layout">
        <section className="character-creation-panel">
          <span className="gateway-panel-corner gateway-panel-corner-tl" />
          <span className="gateway-panel-corner gateway-panel-corner-tr" />
          <span className="gateway-panel-corner gateway-panel-corner-bl" />
          <span className="gateway-panel-corner gateway-panel-corner-br" />

          <div className="character-creation-brand"><BrandLogo /></div>
          <div className="character-creation-divider" aria-hidden="true"><span /></div>

          <div className="character-creation-copy">
            <p>Pierwszy rozdział</p>
            <h1>Nadaj imię bohaterowi</h1>
            <p>To imię zostanie zapisane w rankingach, kronikach walk oraz historii bractw Etherii.</p>
          </div>

          <form className="character-creation-form" onSubmit={handleSubmit}>
            <TextField label="Imię postaci" name="characterName" minLength={3} maxLength={20} value={name} onChange={(event) => setName(event.target.value)} error={error} required autoFocus />
            <Button type="submit" fullWidth disabled={mutation.isPending}>{mutation.isPending ? 'Zapisywanie…' : 'Rozpocznij kronikę'}</Button>
          </form>

          <p className="character-creation-rule">3–20 znaków · litery, cyfry i podkreślenia</p>
        </section>
      </div>
    </main>
  );
}
