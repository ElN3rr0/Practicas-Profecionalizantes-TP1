import { levelProgress } from '../progression/levels';
import type { Profile } from '../profiles/types';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Derived from the profile; never stored, so it cannot drift. */
  check: (profile: Profile) => boolean;
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first_win',
    name: 'Primera victoria',
    description: 'Ganá tu primera partida.',
    icon: 'emoji_events',
    check: (profile) => profile.stats.wins >= 1,
  },
  {
    id: 'streak_5',
    name: 'En racha',
    description: 'Alcanzá una racha de 5 aciertos.',
    icon: 'local_fire_department',
    check: (profile) => profile.stats.bestStreak >= 5,
  },
  {
    id: 'streak_10',
    name: 'Imparable',
    description: 'Alcanzá una racha de 10 aciertos.',
    icon: 'bolt',
    check: (profile) => profile.stats.bestStreak >= 10,
  },
  {
    id: 'ten_games',
    name: 'Veterano',
    description: 'Jugá 10 partidas.',
    icon: 'military_tech',
    check: (profile) => profile.stats.gamesPlayed >= 10,
  },
  {
    id: 'level_5',
    name: 'Ascenso',
    description: 'Llegá al nivel 5.',
    icon: 'workspace_premium',
    check: (profile) => levelProgress(profile.totalXp).level >= 5,
  },
  {
    id: 'level_10',
    name: 'Mítico',
    description: 'Llegá al nivel 10.',
    icon: 'auto_awesome',
    check: (profile) => levelProgress(profile.totalXp).level >= 10,
  },
  {
    id: 'rich',
    name: 'Coleccionista',
    description: 'Ganá 100 monedas en total.',
    icon: 'paid',
    check: (profile) => profile.totalCoinsEarned >= 100,
  },
  {
    id: 'magnate',
    name: 'Magnate',
    description: 'Ganá 500 monedas en total.',
    icon: 'savings',
    check: (profile) => profile.totalCoinsEarned >= 500,
  },
  {
    id: 'perfect_10',
    name: 'Cerebrito',
    description: 'Acertá 10 preguntas en total.',
    icon: 'psychology',
    check: (profile) => profile.stats.correctAnswers >= 10,
  },
  {
    id: 'sniper',
    name: 'Francotirador',
    description: 'Mantené 80% de aciertos con al menos 20 respuestas.',
    icon: 'track_changes',
    check: (profile) => {
      const total = profile.stats.correctAnswers + profile.stats.incorrectAnswers;
      return total >= 20 && profile.stats.correctAnswers / total >= 0.8;
    },
  },
];

export function unlockedAchievements(profile: Profile): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.check(profile));
}
