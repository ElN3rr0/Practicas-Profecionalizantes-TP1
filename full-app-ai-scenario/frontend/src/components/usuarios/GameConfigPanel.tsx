import { POWERUP_IDS, useGame } from '../../lib/game/GameProvider';
import type { GameMode, Language, PowerupId } from '../../lib/game/types';

interface ModeOption {
  id: GameMode;
  label: string;
  icon: string;
}

interface TimeOption {
  seconds: 15 | 20 | 30;
  label: string;
}

interface PowerupOption {
  id: PowerupId;
  label: string;
  icon: string;
}

const MODE_OPTIONS: readonly ModeOption[] = [
  { id: 'coronas', label: '6 Coronas', icon: 'workspace_premium' },
  { id: 'rondas', label: '10 Rondas', icon: 'military_tech' },
  { id: 'duelo', label: 'Duelo Definitivo', icon: 'sports_martial_arts' },
  { id: 'contrarreloj', label: 'Contrarreloj', icon: 'timer' },
];

const TIME_OPTIONS: readonly TimeOption[] = [
  { seconds: 15, label: '15s' },
  { seconds: 20, label: '20s' },
  { seconds: 30, label: '30s' },
];

const POWERUP_OPTIONS: readonly PowerupOption[] = [
  { id: 'fifty-fifty', label: '50/50', icon: 'balance' },
  { id: 'second-chance', label: '2da Chance', icon: 'replay' },
  { id: 'plus-time', label: '+15s', icon: 'timer' },
  { id: 'skip-question', label: 'Pasa la pregunta', icon: 'skip_next' },
  { id: 'hint', label: 'Pista', icon: 'lightbulb' },
];

interface LanguageOption {
  id: Language;
  label: string;
  flag: string;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { id: 'es', label: 'Español', flag: '🇦🇷' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
];

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-[#888888]';

export default function GameConfigPanel() {
  const { state, setConfig } = useGame();
  const config = state.config;

  const setMode = (mode: GameMode) => setConfig({ ...config, mode });

  const setTime = (timePerTurn: 15 | 20 | 30) => setConfig({ ...config, timePerTurn });

  const togglePowerup = (id: PowerupId) => {
    const enabled = new Set(config.powerups);
    if (enabled.has(id)) {
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    setConfig({ ...config, powerups: POWERUP_IDS.filter((powerup) => enabled.has(powerup)) });
  };

  const setLanguage = (language: Language) => setConfig({ ...config, language });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <section className="flex flex-col justify-between rounded-xl border border-[#202020] bg-[#101010] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={sectionTitle}>Idioma / Language</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = config.language === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setLanguage(option.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  selected
                    ? 'border border-lime-primary/50 bg-plum text-lime-primary'
                    : 'border border-transparent bg-[#181818] text-[#888888] hover:text-light-text'
                }`}
              >
                <span aria-hidden="true">{option.flag}</span>
                {option.label}
              </button>
            );
          })}
        </div>
      </section>
      <section className="flex flex-col justify-between rounded-xl border border-[#202020] bg-[#101010] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={sectionTitle}>Modo de Juego</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MODE_OPTIONS.map((option) => {
            const selected = config.mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(option.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  selected
                    ? 'border border-lime-primary/50 bg-plum text-lime-primary'
                    : 'border border-transparent bg-[#181818] text-[#888888] hover:text-light-text'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  {option.icon}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-pressed={config.tournament === true}
          onClick={() => setConfig({ ...config, tournament: config.tournament !== true })}
          className={`mt-2 flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
            config.tournament === true
              ? 'border-lime-primary/50 bg-plum text-lime-primary'
              : 'border border-[#262626] bg-[#181818] text-[#888888] hover:text-light-text'
          }`}
        >
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              emoji_events
            </span>
            Torneo · al mejor de 3
          </span>
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              config.tournament === true ? 'bg-lime-primary' : 'bg-[#444444]'
            }`}
          />
        </button>
      </section>

      <section className="flex flex-col justify-between rounded-xl border border-[#202020] bg-[#101010] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={sectionTitle}>Tiempo por Turno</h2>
          <span className="text-[11px] text-[#777777]">Segundos</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TIME_OPTIONS.map((option) => {
            const selected = config.timePerTurn === option.seconds;
            return (
              <button
                key={option.seconds}
                type="button"
                aria-pressed={selected}
                onClick={() => setTime(option.seconds)}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  selected
                    ? 'border border-lime-primary/50 bg-plum text-lime-primary'
                    : 'border border-transparent bg-[#181818] text-[#888888] hover:text-light-text'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#202020] bg-[#101010] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={sectionTitle}>Comodines Activos</h2>
        </div>
        <div className="flex flex-col gap-2">
          {POWERUP_OPTIONS.map((option) => {
            const selected = config.powerups.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => togglePowerup(option.id)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  selected
                    ? 'border-lime-primary/50 bg-plum text-lime-primary'
                    : 'border border-[#262626] bg-[#181818] text-[#888888] hover:text-light-text'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    {option.icon}
                  </span>
                  {option.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${selected ? 'bg-lime-primary' : 'bg-[#444444]'}`}
                />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
