import { useId, useState } from 'react';
import {
  INPUT_KINDS,
  generateArray,
  parseNumbers,
  type InputKind,
} from '../algorithms/array/generate';
import { randomSeed } from '../algorithms/rng';
import { ShuffleIcon } from './icons';

interface Props {
  values: readonly number[];
  onChange: (values: number[]) => void;
  min?: number;
  max?: number;
  /** Fuerza la entrada ordenada (búsqueda binaria / interpolación). */
  sortedOnly?: boolean;
}

/** Entrada personalizable: tamaño, tipo de datos o ingreso manual. */
export function ArrayInput({ values, onChange, min = 4, max = 80, sortedOnly = false }: Props) {
  const [kind, setKind] = useState<InputKind>('aleatorio');
  const [n, setN] = useState(values.length || 16);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sizeId = useId();
  const manualId = useId();

  const regenerate = (k: InputKind, size: number) => {
    const effective = sortedOnly && k !== 'repetidos' ? 'ordenado' : k;
    let next = generateArray(effective, size, randomSeed());
    if (sortedOnly) next = next.sort((a, b) => a - b);
    onChange(next);
  };

  const applyManual = () => {
    const parsed = parseNumbers(text, 120);
    if (!parsed) {
      setError('Ingresá entre 1 y 120 enteros separados por comas o espacios (|x| ≤ 9999).');
      return;
    }
    setError(null);
    onChange(sortedOnly ? parsed.sort((a, b) => a - b) : parsed);
    setN(Math.min(max, Math.max(min, parsed.length)));
  };

  return (
    <div className="input-panel">
      <div className="segmented" role="group" aria-label="Tipo de datos">
        {INPUT_KINDS.filter(
          (k) => !sortedOnly || k.value === 'aleatorio' || k.value === 'repetidos',
        ).map((k) => (
          <button
            key={k.value}
            type="button"
            className={kind === k.value ? 'is-active' : ''}
            aria-pressed={kind === k.value}
            onClick={() => {
              setKind(k.value);
              regenerate(k.value, n);
            }}
          >
            {k.label}
          </button>
        ))}
      </div>

      <label className="field field--inline" htmlFor={sizeId}>
        <span>
          n = <b className="mono">{n}</b>
        </span>
        <input
          id={sizeId}
          type="range"
          min={min}
          max={max}
          value={n}
          onChange={(e) => {
            const size = Number(e.target.value);
            setN(size);
            regenerate(kind, size);
          }}
        />
      </label>

      <button type="button" className="btn" onClick={() => regenerate(kind, n)}>
        <ShuffleIcon /> Nuevos datos
      </button>

      <form
        className="field field--inline manual"
        onSubmit={(e) => {
          e.preventDefault();
          applyManual();
        }}
      >
        <label htmlFor={manualId} className="sr-only">
          Ingresar datos a mano
        </label>
        <input
          id={manualId}
          className="mono"
          placeholder="A mano: 5, 3, 8, 1…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? `${manualId}-err` : undefined}
        />
        <button type="submit" className="btn">
          Usar
        </button>
      </form>
      {error && (
        <p id={`${manualId}-err`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
