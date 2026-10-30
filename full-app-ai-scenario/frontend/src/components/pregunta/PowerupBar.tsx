import { POWERUPS } from '../../lib/constants/powerups';
import type { PowerupId, PowerupInventory } from '../../lib/game/types';

interface PowerupBarProps {
  inventory: PowerupInventory;
  enabled: readonly PowerupId[];
  disabled: boolean;
  onUse: (id: PowerupId) => void;
}

export default function PowerupBar({ inventory, enabled, disabled, onUse }: PowerupBarProps) {
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-2">
      {POWERUPS.map((powerup) => {
        const remaining = inventory[powerup.id];
        const available = enabled.includes(powerup.id) && remaining > 0;

        // 2da Chance resolves itself when an answer is wrong, so it shows its charge
        // instead of pretending to be a button the player could fire.
        if (powerup.id === 'second-chance') {
          return (
            <div
              key={powerup.id}
              data-testid={`powerup-${powerup.id}`}
              title={powerup.description}
              aria-label={`${powerup.label}, automática, ${remaining} disponible`}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 ${
                available
                  ? 'border-plum bg-[#1b1424] text-lime-pastel'
                  : 'border-[#262626] bg-[#141414] text-[#5c5c5c]'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                {powerup.icon}
              </span>
              <span className="font-display text-[11px] font-semibold">{powerup.label}</span>
              <span className="font-mono text-[10px] opacity-80">{remaining}</span>
            </div>
          );
        }

        return (
          <button
            key={powerup.id}
            type="button"
            data-testid={`powerup-${powerup.id}`}
            title={powerup.description}
            aria-label={`${powerup.label}, ${remaining} disponible`}
            disabled={disabled || !available}
            onClick={() => onUse(powerup.id)}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 transition-all ${
              disabled || !available
                ? 'cursor-not-allowed border-[#262626] bg-[#141414] text-[#5c5c5c]'
                : 'border-plum bg-[#1b1424] text-light-text hover:border-lime-primary/60 hover:text-lime-primary'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              {powerup.icon}
            </span>
            <span className="font-display text-[11px] font-semibold">{powerup.label}</span>
            <span className="font-mono text-[10px] opacity-80">{remaining}</span>
          </button>
        );
      })}
    </div>
  );
}
