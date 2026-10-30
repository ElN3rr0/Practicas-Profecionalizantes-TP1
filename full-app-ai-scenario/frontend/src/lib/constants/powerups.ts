import type { PowerupId } from '../game/types';

export type PowerupMeta = {
  id: PowerupId;
  label: string;
  icon: string;
  description: string;
};

/** Canonical powerup copy and iconography, shared by the setup panel and the question screen. */
export const POWERUPS: readonly PowerupMeta[] = [
  {
    id: 'fifty-fifty',
    label: '50/50',
    icon: 'balance',
    description: 'Descarta dos respuestas incorrectas',
  },
  {
    id: 'second-chance',
    label: '2da Chance',
    icon: 'replay',
    description: 'Se activa sola al responder mal: repite la pregunta una vez',
  },
  {
    id: 'plus-time',
    label: '+15s',
    icon: 'timer',
    description: 'Suma 15 segundos al turno en curso',
  },
  {
    id: 'skip-question',
    label: 'Pasa la pregunta',
    icon: 'skip_next',
    description: 'Cambia la pregunta por otra de la misma categoría',
  },
  {
    id: 'hint',
    label: 'Pista',
    icon: 'lightbulb',
    description: 'Revela la primera letra y el largo de la respuesta',
  },
];
