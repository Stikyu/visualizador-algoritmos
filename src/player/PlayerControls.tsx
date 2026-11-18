import type { CSSProperties } from 'react';
import {
  EndIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  StepBackIcon,
  StepForwardIcon,
} from '../ui/icons';
import { SPEEDS, type PlayerControls as Player } from './usePlayer';

const fmtSpeed = (s: number) => `${s} pasos por segundo`;

/** Barra de controles del reproductor: botones, barra de progreso navegable y velocidad. */
export function PlayerControls({ player, compact = false }: { player: Player; compact?: boolean }) {
  const { position, length, playing } = player;
  const pct = length === 0 ? 0 : (position / length) * 100;
  return (
    <div
      className={`player ${compact ? 'player--compact' : ''}`}
      role="group"
      aria-label="Reproductor"
    >
      <div className="player__buttons">
        <button
          type="button"
          className="icon-btn"
          onClick={player.reset}
          disabled={position === 0}
          aria-label="Reiniciar (Inicio)"
          title="Reiniciar (Inicio)"
        >
          <ResetIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => player.prev()}
          disabled={position === 0}
          aria-label="Paso anterior (←)"
          title="Paso anterior (←)"
        >
          <StepBackIcon />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--primary"
          onClick={player.toggle}
          disabled={length === 0}
          aria-label={playing ? 'Pausar (espacio)' : 'Reproducir (espacio)'}
          title={playing ? 'Pausar (espacio)' : 'Reproducir (espacio)'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => player.next()}
          disabled={position >= length}
          aria-label="Paso siguiente (→)"
          title="Paso siguiente (→)"
        >
          <StepForwardIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={player.toEnd}
          disabled={position >= length}
          aria-label="Ir al final (Fin)"
          title="Ir al final (Fin)"
        >
          <EndIcon />
        </button>
      </div>

      <label className="player__progress">
        <span className="sr-only">Progreso</span>
        <input
          type="range"
          min={0}
          max={length}
          value={position}
          onChange={(e) => player.seek(Number(e.target.value))}
          style={{ '--pct': `${pct}%` } as CSSProperties}
          aria-valuetext={`Paso ${position} de ${length}`}
        />
        <span className="player__count mono">
          {position}
          <span className="muted"> / {length}</span>
        </span>
      </label>

      {!compact && (
        <label className="player__speed">
          <span className="muted small">Velocidad</span>
          <input
            type="range"
            min={0}
            max={SPEEDS.length - 1}
            value={player.speedIndex}
            onChange={(e) => player.setSpeedIndex(Number(e.target.value))}
            aria-valuetext={fmtSpeed(player.speed)}
          />
          <span className="mono small player__speed-val">{player.speed}×</span>
        </label>
      )}
    </div>
  );
}
